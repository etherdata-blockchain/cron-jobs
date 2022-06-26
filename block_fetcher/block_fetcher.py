import os
import traceback
import uuid
from typing import Dict, List, Tuple

import certifi
import requests
from pymongo import MongoClient
from pymongo.collection import Collection
from tqdm import tqdm


class BlockFetcher:
    def __init__(self):
        self.url = os.getenv("RPC_URL")
        self.db_endpoint = os.getenv("DATABASE_URL")
        self.latest_db_block_number = 0
        self.latest_rpc_block_number = 0
        self.mongodb: MongoClient = None
        self.headers = {
            'Content-Type': 'application/json'
        }

    def __connect_db__(self):
        self.mongodb = MongoClient(self.db_endpoint, tlsCAFile=certifi.where())
        block_collection = self.mongodb.etd.blocks
        transaction_collection = self.mongodb.etd.transactions
        try:
            block_collection.create_index([("hash", 1)], unique=True)
            block_collection.create_index([("timeStamp", 1)])

            transaction_collection.create_index([("hash", 1)], unique=True)
        except Exception as e:
            print(e)
            print("Indexes already created")

    def __fetch_rpc_block_number__(self) -> int:
        data = {
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": str(uuid.uuid4())
        }

        response = requests.request("POST", self.url, headers=self.headers, json=data)
        resp_data = response.json()
        block_num_in_hex = resp_data['result']
        return int(block_num_in_hex, 16)

    def __fetch_db_block_number__(self) -> int:
        db = self.mongodb.etd
        blocks_col: Collection = db.blocks
        highest_blocks = list(blocks_col.find({}).sort("numberInBase10", -1).limit(1))
        if len(highest_blocks) == 0:
            return 0
        return int(highest_blocks[0]['numberInBase10'])

    def __fetch_block__(self, block_number: int) -> Tuple[List, List]:
        """
        Fetch block
        :param block_number:
        :return: List of blocks and transactions. Blocks will be current block and its uncles
        """
        hex_block_number = hex(block_number)
        data = {"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [hex_block_number, True],
                "id": str(uuid.uuid4()), }
        resp = requests.request("POST", self.url, json=data, headers=self.headers)
        block: Dict = resp.json()['result']
        block["numberInBase10"] = int(block["number"], 16)
        block["timestamp"] = int(block["timestamp"], 16)
        blocks = []
        uncles = self.__fetch_uncles__(block['uncles'], block['hash'])
        transactions = block.pop("transactions")
        # add timestamp to transactions
        for tx in transactions:
            tx["timestamp"] = block["timestamp"]

        blocks.append(block)
        blocks += uncles

        return blocks, transactions

    def remove_blocks(self):
        db = self.mongodb.etd
        block_col: Collection = db.blocks
        block_col.delete_many({})

    def __fetch_uncles__(self, uncles: List[str], block_hash: str):
        blocks = []
        for index, uncle_hash in enumerate(uncles):
            data = {"jsonrpc": "2.0", "method": "eth_getUncleByBlockHashAndIndex", "params": [block_hash, hex(index)],
                    "id": str(uuid.uuid4())}
            resp = requests.request("POST", self.url, json=data, headers=self.headers)
            resp_data: Dict = resp.json()['result']
            blocks.append(resp_data)

        return blocks

    def __insert_block__(self, blocks):
        db = self.mongodb.etd
        blocks_col: Collection = db.blocks
        blocks_col.insert_many(blocks)

    def __insert_transactions__(self, transactions):
        db = self.mongodb.etd
        tx_col: Collection = db.transactions
        tx_col.insert_many(transactions)

    def fetch_blocks(self):
        self.__connect_db__()
        self.latest_rpc_block_number = self.__fetch_rpc_block_number__()
        self.latest_db_block_number = self.__fetch_db_block_number__()
        print(
            f"Highest DB Block Number: {self.latest_db_block_number}, "
            f"Highest RPC Block Number: {self.latest_rpc_block_number}")

        if self.latest_db_block_number > self.latest_rpc_block_number:
            raise Exception("DB block number is greater than rpc")
        number = 0
        for block_number in tqdm(range(self.latest_db_block_number + 1, self.latest_rpc_block_number)):
            number += 1
            if number % 10 == 0:
                print(f"Fetching block {block_number}...")
            try:
                blocks, transactions = self.__fetch_block__(block_number)
                self.__insert_block__(blocks)
                if len(transactions) > 0:
                    self.__insert_transactions__(transactions)
            except Exception as e:
                print(traceback.format_exc())
                print(e)


if __name__ == '__main__':
    fetcher = BlockFetcher()
    fetcher.fetch_blocks()
