import asyncio
import logging
import os
import random
import sys
import traceback
import uuid
from typing import Dict, List, Tuple

import certifi
import httpx
from pymongo import MongoClient
from pymongo.collection import Collection
from tqdm import tqdm

from contract import Contract

logging.basicConfig(stream=sys.stdout, level=logging.INFO)


class BlockFetcher:
    def __init__(self, should_insert_block: bool = True, should_insert_transaction=True, should_insert_contract=True,
                 should_start_from_beginning=False):
        self.url = os.getenv("RPC_URL")
        self.db_endpoint = os.getenv("DATABASE_URL")

        if self.url is None or self.db_endpoint is None:
            raise Exception("Missing environment variables")

        self.start_block_number = 0
        self.end_block_number = 0
        self.mongodb: MongoClient = None
        self.headers = {
            'Content-Type': 'application/json'
        }
        self.should_insert_block = should_insert_block
        self.should_insert_transaction = should_insert_transaction
        self.should_insert_contract = should_insert_contract
        self.should_start_from_beginning = should_start_from_beginning
        self.default_db = os.getenv("DEFAULT_DB", "etd")
        self.batch_size = int(os.getenv("BATCH_SIZE", 10))

    async def __connect_db__(self):
        self.mongodb = MongoClient(self.db_endpoint, tlsCAFile=certifi.where())
        block_collection = self.mongodb[self.default_db].blocks
        transaction_collection = self.mongodb[self.default_db].transactions
        contract_collection = self.mongodb[self.default_db].contracts
        try:
            block_collection.create_index([("hash", 1)], unique=True)
            block_collection.create_index([("timeStamp", 1)])
            block_collection.create_index([("numberInBase10", 1)])
            block_collection.create_index([("isUncle", 1)])

            transaction_collection.create_index([("hash", 1)], unique=True)

            contract_collection.create_index([('address', 1)], unique=True)

        except Exception as e:
            print(e)
            print("Indexes already created")

    async def __fetch_rpc_block_number__(self) -> int:
        data = {
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": str(uuid.uuid4())
        }

        response = await httpx.AsyncClient().post(self.url, headers=self.headers, json=data)
        resp_data = response.json()
        block_num_in_hex = resp_data['result']
        return int(block_num_in_hex, 16)

    async def __fetch_db_block_number__(self) -> int:
        db = self.mongodb[self.default_db]
        blocks_col: Collection = db.blocks
        highest_blocks = list(blocks_col.find({}).sort("numberInBase10", -1).limit(1))
        if len(highest_blocks) == 0:
            return 0
        return int(highest_blocks[0]['numberInBase10'])

    async def __fetch_block__(self, block_number: int) -> Tuple[List, List]:
        """
        Fetch block
        :param block_number:
        :return: List of blocks and transactions. Blocks will be current block and its uncles
        """
        hex_block_number = hex(block_number)
        data = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [hex_block_number, True],
                "id": str(uuid.uuid4()), }
        resp = await httpx.AsyncClient().post(self.url, headers=self.headers, json=data)
        block: Dict = resp.json()['result']
        block["numberInBase10"] = int(block["number"], 16)
        block["timestamp"] = int(block["timestamp"], 16)
        blocks = []
        uncles = await self.__fetch_uncles__(block['uncles'], block['hash'])
        transactions = block.pop("transactions")
        # add timestamp to transactions
        for tx in transactions:
            tx["timestamp"] = block["timestamp"]

        blocks.append(block)
        blocks += uncles

        return blocks, transactions

    async def __get_code__(self, contract_address: str) -> str:
        data = {
            "jsonrpc": "2.0",
            "method": "eth_getCode",
            "params": [contract_address, "latest"],
            "id": str(uuid.uuid4())
        }
        resp = await httpx.AsyncClient().post(self.url, headers=self.headers, json=data)
        return resp.json()['result']

    async def __fetch_contract__(self, block_hash: str, transaction_address: str, block_number: str,
                                 block_time: str) -> Contract:
        """
        Fetch contract using block hash and transaction address
        :param block_hash:
        :param transaction_address:
        :param byte_code:
        :return:
        """
        data = {
            "jsonrpc": "2.0",
            "method": "eth_getTransactionReceipt",
            "params": [transaction_address],
            "id": random.randint(1, 100000)
        }

        response = await httpx.AsyncClient().post(self.url, headers=self.headers, json=data)
        resp_data = response.json()['result']
        contract_address = resp_data['contractAddress']
        creator_address = resp_data['from']
        byte_code = await self.__get_code__(contract_address)

        contract = Contract(creator=creator_address, address=contract_address, block_hash=block_hash,
                            byte_code=byte_code, transaction_hash=transaction_address, block_number=block_number,
                            block_time=block_time)
        return contract

    async def __process_transactions__(self, transactions: List[Dict], block: Dict):
        for tx in transactions:
            if tx['to'] is None:
                # contract creation
                contract = await self.__fetch_contract__(tx['blockHash'], tx['hash'], block['number'],
                                                         block['timestamp'])
                await self.__insert_contract__(contract)

    async def remove_blocks(self):
        db = self.mongodb[self.default_db]
        block_col: Collection = db.blocks
        block_col.delete_many({})

    async def __fetch_uncles__(self, uncles: List[str], block_hash: str):
        blocks = []
        for index, uncle_hash in enumerate(uncles):
            data = {"jsonrpc": "2.0", "method": "eth_getUncleByBlockHashAndIndex", "params": [block_hash, hex(index)],
                    "id": str(uuid.uuid4())}
            resp = await httpx.AsyncClient().post(self.url, headers=self.headers, json=data)
            resp_data: Dict = resp.json()['result']
            resp_data["numberInBase10"] = int(resp_data["number"], 16)
            resp_data["isUncle"] = True
            blocks.append(resp_data)

        return blocks

    async def __insert_block__(self, blocks):
        if not self.should_insert_block:
            return
        db = self.mongodb[self.default_db]
        blocks_col: Collection = db.blocks
        blocks_col.insert_many(blocks)

    async def __insert_transactions__(self, transactions):
        if not self.should_insert_transaction:
            return
        db = self.mongodb[self.default_db]
        tx_col: Collection = db.transactions
        tx_col.insert_many(transactions)

    async def __insert_contract__(self, contract: Contract):
        print(f"Inserting contract: {contract.address}")
        if not self.should_insert_contract:
            return
        db = self.mongodb[self.default_db]
        contract_col: Collection = db.contracts
        contract_col.insert_one(contract.to_dict())

    async def fetch_blocks(self):
        """
        Fetch blocks from the latest block in db to the latest block in rpc
        :return:
        """
        await self.__connect_db__()
        self.start_block_number = await self.__fetch_db_block_number__() if not self.should_start_from_beginning else 0
        self.end_block_number = await self.__fetch_rpc_block_number__()
        logging.info(
            f"Start Block Number: {self.start_block_number}, "
            f"End Block Number: {self.end_block_number}")

        if self.start_block_number > self.end_block_number:
            raise Exception("DB block number is greater than rpc")

        for block_number in tqdm(range(self.start_block_number + 1, self.end_block_number + 1, self.batch_size)):
            async def fetch(at_block_number):
                try:
                    blocks, transactions = await self.__fetch_block__(at_block_number)
                    await self.__insert_block__(blocks)
                    if len(transactions) > 0:
                        await self.__process_transactions__(transactions, blocks[0])
                        await self.__insert_transactions__(transactions)
                except Exception as e:
                    logging.error(traceback.format_exc())
                    logging.error(e)

            # put jobs into a list
            logging.info(f"Fetching block: {block_number}")
            await asyncio.gather(
                *[fetch(block_number + i) for i in range(self.batch_size) if i + block_number <= self.end_block_number])


async def main():
    fetcher = BlockFetcher()
    await fetcher.fetch_blocks()


if __name__ == '__main__':
    asyncio.run(main())
