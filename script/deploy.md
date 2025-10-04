1. Deploy contracts
   forge script script/Deploy.s.sol:DeployScript -vvv --broadcast --rpc-url "https://eth-sepolia.g.alchemy.com/v2/NGGJZOQzQL_cNsFGi2fd2-X_PSd_-u2-" --verify --verifier etherscan --etherscan-api-key "IM3626J72KHFR2JA7XXQBYBUT5T48S52TG"

2. create two streams
   forge script script/CreateTwoStreams.s.sol:CreateTwoStreamsScript -vvv --broadcast --rpc-url "https://eth-sepolia.g.alchemy.com/v2/NGGJZOQzQL_cNsFGi2fd2-X_PSd_-u2-"

data sample:

stream-no-cliff-202510031759485252

- Sender: 0xC29de8AD0a5D07aA5b51020883358bdF6b60cE2e
- Recipient: 0x8E6A9D8CB283C3b18898A02B7a4490918629F275

Streams: (active)
stream-no-cliff-202510031759485252
stream-with-cliff-202510031759485252

0xC29de8AD0a5D07aA5b51020883358bdF6b60cE2e
cancel
pasue
completed(doing)
