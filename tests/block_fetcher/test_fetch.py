import json
import os
import unittest

# import httpretty
#
# from block_fetcher.block_fetcher import BlockFetcher


class TestFetch(unittest.TestCase):
    mock_block_response = {
        "result": {
            "number": "0x0",
            "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "nonce": "0x0000000000000000",
            "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
            "transactions": [{
                "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "nonce": "0x0",
                "blockHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "blockNumber": "0x0",
                "transactionIndex": "0x0",
                "from": "0x0000000000000000000000000000000000000000",
                "to": "0x0000000000000000000000000000000000000000",
                "value": "0x0",
                "gas": "0x0",
                "gasPrice": "0x0",
                "input": "0x",
                "raw": "0x",
                "r": "0x0",
                "s": "0x0",
                "v": "0x0",

            }]
        }
    }

    def setUp(self) -> None:
        os.environ = {
            "RPC_URL": "http://localhost:8545",
            "DATABASE_URL": "mongodb://server:27017",
        }

    def test_simple_test(self):
        pass

    # @patch("pymongo.MongoClient")
    # @httpretty.activate(allow_net_connect=True, verbose=True)
    # def test_fetch(self):
    #     mock_block_number_response = {
    #         "result": hex(20)
    #     }
    #
    #     def rpc_callback(request, uri, headers):
    #         if request.body == b'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":"1"}':
    #             return 200, headers, json.dumps(self.mock_block_response)
    #         else:
    #             return 200, headers, json.dumps(mock_block_number_response)
    #
    #     httpretty.register_uri(httpretty.POST, "http://localhost:8545/", body=rpc_callback)
    #     block_fetcher = BlockFetcher()
    #     self.assertEqual(block_fetcher.url, "http://localhost:8545")
    #     # block_fetcher.fetch_blocks()
    #     # self.assertEqual(block_fetcher.latest_db_block_number, 20)
