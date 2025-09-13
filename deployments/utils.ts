/**
 * Deployment utilities for reading contract addresses and configurations
 */

import * as fs from 'fs';
import * as path from 'path';

export type NetworkName = 'mainnet' | 'sepolia' | 'base' | 'local';

export interface ContractInfo {
  address: string;
  deployedAt: string;
  deploymentTx: string;
  blockNumber: number;
  verified: boolean;
  version: string;
}

export interface AddressesConfig {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, ContractInfo>;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string | null;
  deployerAddress: string;
  gasPrice: string;
  confirmations: number;
}

/**
 * Get contract address for a specific network
 */
export function getContractAddress(
  contractName: string,
  network: NetworkName
): string {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found for network: ${network}`);
  }
  
  const addresses: AddressesConfig = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  const contract = addresses.contracts[contractName];
  
  if (!contract) {
    throw new Error(`Contract ${contractName} not found in ${network} deployments`);
  }
  
  return contract.address;
}

/**
 * Get all contract addresses for a network
 */
export function getAllAddresses(network: NetworkName): AddressesConfig {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found for network: ${network}`);
  }
  
  return JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
}

/**
 * Get network configuration
 */
export function getNetworkConfig(network: NetworkName): NetworkConfig {
  const networksPath = path.join(process.cwd(), 'deployments', 'networks.json');
  const networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
  
  return networks.networks[network];
}

/**
 * Update contract address after deployment
 */
export function updateContractAddress(
  network: NetworkName,
  contractName: string,
  contractInfo: ContractInfo
): void {
  const addressesPath = path.join(process.cwd(), 'deployments', `${network}/addresses.json`);
  
  let addresses: AddressesConfig;
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
 * Get contract ABI from artifacts
 */
export function getContractABI(contractName: string): any[] {
  const abiPath = path.join(process.cwd(), 'deployments', `contracts/${contractName}.json`);
  
  if (!fs.existsSync(abiPath)) {
    throw new Error(`ABI not found for contract: ${contractName}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return artifact.abi;
}

/**
 * Validate that all required contracts are deployed on a network
 */
export function validateDeployments(
  network: NetworkName, 
  requiredContracts: string[]
): boolean {
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
export function getExplorerUrl(network: NetworkName, address: string): string | null {
  const config = getNetworkConfig(network);
  if (!config.explorerUrl) return null;
  
  return `${config.explorerUrl}/address/${address}`;
}