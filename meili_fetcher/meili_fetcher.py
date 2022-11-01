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
        self.meilisearch.create_index("blocks", {'primaryKey': 'id'})
        self.blocks_col = self.mongodb.etd.blocks

    def add_to_meilisearch(self):
        self.__connect_db__()
        batch_size = 200
        self.__add_block_index__(batch_size)

    def __add_block_index__(self, batch_size):
        end = self.blocks_col.count_documents({})
        start = self.meilisearch.index("blocks").get_stats()["numberOfDocuments"]

        for i in tqdm(range(start, end, batch_size)):
            blocks = self.blocks_col.find({}).skip(i).limit(batch_size)
            old_blocks = loads(dumps(blocks))
            new_blocks = []
            for i in range(len(old_blocks)):
                block = old_blocks[i]
                block["_id"] = block["_id"]["$oid"]
                new_block = {"type": "block", "data": block, "_id": block["_id"]}
                new_blocks.append(new_block)
            self.meilisearch.index("blocks").add_documents(new_blocks)


if __name__ == '__main__':
    fetcher = MeiliFetcher()
    fetcher.add_to_meilisearch()
