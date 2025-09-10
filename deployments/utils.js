/**
 * Deployment utilities for reading contract addresses and configurations (JavaScript version)
 */

const fs = require('fs');
const path = require('path');

/**
 * Get contract address for a specific network
 */
function getContractAddress(contractName, network) {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found for network: ${network}`);
  }
  
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  const contract = addresses.contracts[contractName];
  
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in ${network} deployments`);
  }
  
  return contract.address;
}

/**
 * Get all contract addresses for a network
 */
function getAllAddresses(network) {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found for network: ${network}`);
  }
  
  return JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
}

/**
 * Get network configuration
 */
function getNetworkConfig(network) {
  const networksPath = path.join(process.cwd(), 'deployments', 'networks.json');
  const networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
  
  return networks.networks[network];
}

/**
 * Update contract address after deployment
 */
function updateContractAddress(network, contractName, contractInfo) {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  let addresses;
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  } else {
    // Create initial structure
    addresses = {
      network,
      chainId: getNetworkConfig(network).chainId,
      deployedAt: new Date().toISOString(),
      deployer: getNetworkConfig(network).deployerAddress,
      contracts: {}
    };
  }
  
  addresses.contracts[contractName] = contractInfo;
  
  // Ensure directory exists
  const dir = path.dirname(addressesPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
}

/**
 * Validate that all required contracts are deployed on a network
 */
function validateDeployments(network, requiredContracts) {
  try {
    const addresses = getAllAddresses(network);
    
    for (const contractName of requiredContracts) {
      const contract = addresses.contracts[contractName];
      if (!contract || contract.address === '0x0000000000000000000000000000000000000000') {
        console.error(`❌ ${contractName} not properly deployed on ${network}`);
        return false;
      }
      console.log(`✅ ${contractName}: ${contract.address}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error validating deployments on ${network}:`, error);
    return false;
  }
}

/**
 * Get explorer URL for a contract
 */
function getExplorerUrl(network, address) {
  const config = getNetworkConfig(network);
  if (!config.explorerUrl) return null;
  
  return `${config.explorerUrl}/address/${address}`;
}

module.exports = {
  getContractAddress,
  getAllAddresses,
  getNetworkConfig,
  updateContractAddress,
  validateDeployments,
  getExplorerUrl
};