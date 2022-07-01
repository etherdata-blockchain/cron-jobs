import json
import os
from typing import List, Tuple, Type

import certifi
import requests
from pymongo import MongoClient
from tqdm import tqdm
from web3 import Web3, HTTPProvider
from web3.contract import Contract


class UserFetcher:
    web3: Web3

    def __init__(self):
        self.url = os.getenv("RPC_URL")
        self.db_endpoint = os.getenv("DATABASE_URL")
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        self.mongodb: MongoClient = None
        self.step = 40

    def __connect_db__(self):
        self.mongodb = MongoClient(self.db_endpoint, tlsCAFile=certifi.where())
        try:
            etd = self.mongodb.etd
            users = etd.users
            users.create_index([("address", 1)], unique=True)
        except Exception as e:
            print(e)
            print("Indexes already created")

    def __connect_web3__(self):
        self.web3 = Web3(HTTPProvider(self.url))

    def __download_abi__(self) -> Tuple[dict, str]:
        url = "https://github.com/etherdata-blockchain/etdstats_user_contract/releases/latest/download/User.json"
        response = requests.get(url)
        print("Downloading ABI")
        with open("User.json", "w") as f:
            f.write(response.text)
            user_data = response.json()
            return user_data["abi"], user_data["bytecode"]

    def __fetch_user_addresses__(self, contract: Contract | Type[Contract]):
        """
        Fetch user addresses from the contract
        :param contract:
        :return:
        """
        total_users = contract.functions.getUserCount().call()
        for i in range(0, total_users, self.step):
            print("Fetching users {} to {}".format(i, i + self.step))
            found_addresses = contract.functions.getUserAddressesInRange(i, i + self.step).call()
            self.__fetch_user_detail__(contract=contract, user_addresses=found_addresses)

    def __fetch_user_detail__(self, contract: Contract | Type[Contract], user_addresses: List[str]):
        """
        Fetch user details from the contract
        :param contract:
        :param user_addresses:
        :return:
        """
        db = self.mongodb.etd
        users_col = db.users
        for address in tqdm(user_addresses):
            address: str
            user: str = contract.functions.getUser(address).call()
            user_data = json.loads(user)
            address = address.lower()
            user_data["address"] = address
            users_col.update_one({"address": address}, {"$set": user_data}, upsert=True)

    def fetch(self):
        self.__connect_db__()
        self.__connect_web3__()
        abi, bytecode = self.__download_abi__()
        contract = self.web3.eth.contract(abi=abi, bytecode=bytecode, address=self.contract_address)
        self.__fetch_user_addresses__(contract=contract)


if __name__ == '__main__':
    fetcher = UserFetcher()
    fetcher.fetch()
