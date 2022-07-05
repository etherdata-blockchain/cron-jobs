import os
from json import loads

import certifi
from bson.json_util import dumps
from meilisearch import Client
from pymongo import MongoClient
from tqdm import tqdm


class MeiliFetcher:
    mongodb: MongoClient
    meilisearch: Client

    def __init__(self):
        self.url = os.getenv("RPC_URL")
        self.db_endpoint = os.getenv("DATABASE_URL")
        self.meilisearch_endpoint = os.getenv("MEILISEARCH_URL")
        self.meilisearch_master_key = os.getenv("MEILISEARCH_MASTER_KEY")
        self.latest_db_block_number = 0
        self.latest_rpc_block_number = 0
        self.headers = {
            'Content-Type': 'application/json'
        }

    def __connect_db__(self):
        self.mongodb = MongoClient(self.db_endpoint, tlsCAFile=certifi.where())
        self.meilisearch = Client(self.meilisearch_endpoint, api_key=self.meilisearch_master_key)
        self.blocks_col = self.mongodb.etd.blocks

    def add_to_meilisearch(self):
        self.__connect_db__()
        end = self.blocks_col.count_documents({})
        start = self.meilisearch.index("blocks").get_stats()["numberOfDocuments"]
        print(f"Start: {start}, End: {end}")
        self.__add_to_meilisearch__(start, end)

    def __add_to_meilisearch__(self, start: int, end: int):
        batch_size = 1000
        for i in tqdm(range(start, end, batch_size)):
            blocks = self.blocks_col.find({}).skip(i).limit(batch_size)
            blocks = loads(dumps(blocks))
            for i in range(len(blocks)):
                block = blocks[i]
                block["_id"] = block["_id"]["$oid"]
                blocks[i] = block
            self.meilisearch.index("blocks").add_documents(blocks)


if __name__ == '__main__':
    fetcher = MeiliFetcher()
    fetcher.add_to_meilisearch()
