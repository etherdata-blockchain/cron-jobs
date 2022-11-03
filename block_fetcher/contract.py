import json


class Contract:
    address: str
    creator: str
    transaction_hash: str
    block_hash: str
    byte_code: str

    def __init__(self, address: str, creator: str, transaction_hash: str, block_hash: str, byte_code: str):
        self.address = address
        self.creator = creator
        self.transaction_hash = transaction_hash
        self.block_hash = block_hash
        self.byte_code = byte_code

    def to_dict(self):
        return {
            "address": self.address,
            "creator": self.creator,
            "transactionHash": self.transaction_hash,
            "blockHash": self.block_hash,
            "byteCode": self.byte_code,
            "lastScannedBlock": 0
        }

    def to_json(self):
        return json.dumps(self.to_dict())
