import json
import os
from typing import Dict, List, Tuple
import certifi
import requests
from pymongo import MongoClient
from pymongo.collection import Collection
import datetime
from tqdm import tqdm


class BlockFetcher:
    def __init__(self):
        self.url = os.getenv("RPC_URL")
        self.db_endpoint = os.getenv("MONGODB_URL")
        self.latest_db_block_number = 0
        self.latest_rpc_block_number = 0
        self.mongodb: MongoClient = None
        self.keys_transform_ignored = ["parentHash", "hash", "sha3Uncles", "stateRoot", "blockHash", "from", "to",
                                       "miner", "extraData", "minHash", "receiptsRoot", "transactionsRoot",  "nonce"]
        self.keys_ignored = ["logsBloom", "r", "s", "v"]

    def __connect_db__(self):
        self.mongodb = MongoClient(self.db_endpoint, tlsCAFile=certifi.where())

    def __fetch_rpc_block_number__(self) -> int:
        data = {"jsonrpc": "2.0", "method": "etd_blockNumber", "params": []}
        resp = requests.post(self.url, json=data)
        resp_data = resp.json()
        block_num_in_hex = resp_data['result']
        return int(block_num_in_hex, 16)

    def __fetch_db_block_number__(self) -> int:
        db = self.mongodb.etd
        blocks_col: Collection = db.blocks
        highest_blocks = list(blocks_col.find({}).sort("number", -1).limit(1))
        if len(highest_blocks) == 0:
            return 0
        return int(highest_blocks[0]['number'])

    def __fetch_block__(self, block_number: int) -> Tuple[List, List]:
        """
        Fetch block
        :param block_number:
        :return: List of blocks and transactions. Blocks will be current block and its uncles
        """
        hex_block_number = hex(block_number)
        data = {"jsonrpc": "2.0", "method": "etd_getBlockByNumber", "params": [hex_block_number, True]}
        resp = requests.post(self.url, json=data)
        block: Dict = resp.json()['result']
        blocks = []
        block = self.__normalize_dict__(block)
        uncles = self.__fetch_uncles__(block['uncles'], block['hash'])
        transactions = block.pop("transactions")

        blocks.append(block)
        blocks += uncles

        return blocks, transactions

    def __normalize_dict__(self, data: Dict):
        items = list(data.items())
        for key, value in items:
            if key in self.keys_ignored:
                del data[key]
                continue

            if key in self.keys_transform_ignored:
                continue

            if key == "timestamp":
                data[key] = datetime.datetime.fromtimestamp(int(value, 16))
                continue

            if type(value) == str and value.startswith("0x"):
                data[key] = float(int(value, 16))

        return data

    def __fetch_uncles__(self, uncles: List[str], block_hash: str):
        blocks = []
        for index, uncle_hash in enumerate(uncles):
            data = {"jsonrpc": "2.0", "method": "etd_getUncleByBlockHashAndIndex", "params": [block_hash, hex(index)]}
            resp = requests.post(self.url, json=data)
            resp_data: Dict = resp.json()['result']
            resp_data = self.__normalize_dict__(resp_data)
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
        for block_number in tqdm(range(self.latest_db_block_number + 1, self.latest_rpc_block_number)):
            try:
                blocks, transactions = self.__fetch_block__(block_number)
                self.__insert_block__(blocks)
            except Exception as e:
                print(e)


if __name__ == '__main__':
    fetcher = BlockFetcher()
    fetcher.fetch_blocks()
