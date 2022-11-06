import json


class Contract:
    address: str
    creator: str
    transaction_hash: str
    block_hash: str
    byte_code: str
    block_number: str
    block_time: str

    def __init__(self, address: str, creator: str, transaction_hash: str, block_hash: str, byte_code: str,
                 block_number: str, block_time: str):
        self.address = address
        self.creator = creator
        self.transaction_hash = transaction_hash
        self.block_hash = block_hash
        self.byte_code = byte_code
        self.block_number = block_number
        self.block_time = block_time

    def to_dict(self):
        return {
            "address": self.address,
            "creator": self.creator,
            "transactionHash": self.transaction_hash,
            "blockHash": self.block_hash,
            "byteCode": self.byte_code,
            "blockNumber": self.block_number,
            "blockTime": self.block_time,
            "lastScannedBlock": 0
        }

    def to_json(self):
        return json.dumps(self.to_dict())
