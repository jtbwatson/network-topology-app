#!/usr/bin/env python3
"""
GNS3 Config to D2 Parser
Parses Cisco device configuration files and generates D2 topology files
"""

import os
import re
import ipaddress
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class DeviceConfig:
    """Represents a parsed device configuration"""
    def __init__(self, hostname: str, filename: str):
        self.hostname = hostname
        self.filename = filename
        self.device_type = "router"  # Default, can be detected later
        self.model = ""
        self.interfaces = {}
        self.loopbacks = {}
        self.routing_protocols = {}
        self.vlans = {}
        
    def add_interface(self, name: str, config: Dict):
        """Add interface configuration"""
        self.interfaces[name] = config
        
    def add_loopback(self, name: str, config: Dict):
        """Add loopback interface configuration"""
        self.loopbacks[name] = config
        
    def add_routing_protocol(self, protocol: str, config: Dict):
        """Add routing protocol configuration"""
        self.routing_protocols[protocol] = config

def detect_device_os(config_text: str) -> str:
    """Detect the device operating system from configuration text"""
    if "Version AOS-CX" in config_text or "!Version AOS-CX" in config_text:
        return "aruba-cx"
    elif "version " in config_text and ("IOS XE" in config_text or "Cisco" in config_text):
        return "cisco-ios"
    elif "hostname " in config_text and ("interface GigabitEthernet" in config_text or "router ospf" in config_text):
        return "cisco-ios"  # Fallback for Cisco without explicit version
    else:
        return "unknown"

class ConfigParser:
    """Base parser class - detects device type and delegates to appropriate parser"""
    
    def __init__(self, config_dir: str):
        self.config_dir = Path(config_dir)
        self.devices = {}
        
    def parse_all_configs(self) -> Dict[str, DeviceConfig]:
        """Parse all .conf files in the directory"""
        for conf_file in self.config_dir.glob("*.conf"):
            device = self.parse_config_file(conf_file)
            if device:
                self.devices[device.hostname] = device
        return self.devices
        
    def parse_config_file(self, filepath: Path) -> Optional[DeviceConfig]:
        """Parse a single configuration file by detecting device type"""
        try:
            with open(filepath, 'r') as f:
                config_text = f.read()
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            return None
            
        # Detect device OS type
        device_os = detect_device_os(config_text)
        print(f"Detected device OS: {device_os} for {filepath.name}")
        
        # Use appropriate parser based on device type
        if device_os == "cisco-ios":
            parser = CiscoConfigParser()
            return parser.parse_config(config_text, filepath.name)
        elif device_os == "aruba-cx":
            parser = ArubaConfigParser()
            return parser.parse_config(config_text, filepath.name)
        else:
            print(f"Unknown device type for {filepath.name}, skipping...")
            return None

class CiscoConfigParser:
    """Parser for Cisco IOS/IOS-XE configuration files"""
    
    def parse_config(self, config_text: str, filename: str) -> Optional[DeviceConfig]:
        """Parse Cisco configuration text"""
        # Extract hostname
        hostname_match = re.search(r'^hostname\s+(\S+)', config_text, re.MULTILINE)
        if not hostname_match:
            print(f"No hostname found in {filename}")
            return None
            
        hostname = hostname_match.group(1)
        device = DeviceConfig(hostname, filename)
        device.device_type = "router"  # Default for Cisco
        
        # Extract device model from license line
        model_match = re.search(r'license udi pid\s+(\S+)', config_text, re.MULTILINE)
        if model_match:
            device.model = model_match.group(1)
            
        # Parse interfaces
        self._parse_interfaces(config_text, device)
        
        # Parse routing protocols
        self._parse_routing_protocols(config_text, device)
        
        return device
        
    def _parse_interfaces(self, config_text: str, device: DeviceConfig):
        """Parse Cisco interface configurations"""
        # Find all interface blocks
        interface_pattern = r'^interface\s+(\S+)\s*\n((?:(?!^interface|^router|^!).*\n)*)'
        interfaces = re.findall(interface_pattern, config_text, re.MULTILINE)
        
        for intf_name, intf_config in interfaces:
            config_dict = {
                'name': intf_name,
                'status': 'up',  # Default
                'description': '',
                'ip_address': '',
                'subnet_mask': '',
                'negotiation': '',
                'other_config': []
            }
            
            # Check for "no ip address" first
            if 'no ip address' in intf_config:
                config_dict['status'] = 'no_ip'
            else:
                # Parse IP address (only if not "no ip address")
                ip_match = re.search(r'^\s*ip address\s+(\S+)\s+(\S+)', intf_config, re.MULTILINE)
                if ip_match:
                    config_dict['ip_address'] = ip_match.group(1)
                    config_dict['subnet_mask'] = ip_match.group(2)
                
            # Parse description
            desc_match = re.search(r'description\s+(.+)', intf_config)
            if desc_match:
                config_dict['description'] = desc_match.group(1).strip()
                
            # Parse negotiation
            if 'negotiation auto' in intf_config:
                config_dict['negotiation'] = 'auto'
                
            # Store other configuration lines
            for line in intf_config.split('\n'):
                line = line.strip()
                if line and not line.startswith('!') and line not in [
                    f'ip address {config_dict["ip_address"]} {config_dict["subnet_mask"]}',
                    'no ip address',
                    'negotiation auto',
                    f'description {config_dict["description"]}'
                ]:
                    config_dict['other_config'].append(line)
            
            # Categorize interface
            if intf_name.startswith('Loopback'):
                device.add_loopback(intf_name, config_dict)
            else:
                device.add_interface(intf_name, config_dict)
                
    def _parse_routing_protocols(self, config_text: str, device: DeviceConfig):
        """Parse Cisco routing protocol configurations"""
        # Parse BGP
        bgp_match = re.search(r'^router bgp\s+(\d+)\s*\n((?:(?!^router|^interface|^!).*\n)*)', 
                             config_text, re.MULTILINE)
        if bgp_match:
            asn = bgp_match.group(1)
            bgp_config = bgp_match.group(2)
            
            bgp_data = {
                'asn': asn,
                'neighbors': [],
                'address_families': [],
                'redistribute': []
            }
            
            # Parse neighbors
            neighbor_pattern = r'neighbor\s+(\S+)\s+remote-as\s+(\d+)'
            neighbors = re.findall(neighbor_pattern, bgp_config)
            for neighbor_ip, remote_asn in neighbors:
                bgp_data['neighbors'].append({
                    'ip': neighbor_ip,
                    'remote_asn': remote_asn
                })
                
            # Parse redistribution
            if 'redistribute connected' in bgp_config:
                bgp_data['redistribute'].append('connected')
                
            device.add_routing_protocol('bgp', bgp_data)
            
        # Parse OSPF
        ospf_match = re.search(r'^router ospf\s+(\d+)\s*\n((?:(?!^router|^interface|^!).*\n)*)', 
                              config_text, re.MULTILINE)
        if ospf_match:
            process_id = ospf_match.group(1)
            ospf_config = ospf_match.group(2)
            
            ospf_data = {
                'process_id': process_id,
                'router_id': '',
                'networks': [],
                'areas': []
            }
            
            # Parse router-id
            router_id_match = re.search(r'router-id\s+(\S+)', ospf_config)
            if router_id_match:
                ospf_data['router_id'] = router_id_match.group(1)
                
            # Parse networks and areas
            network_pattern = r'network\s+(\S+)\s+(\S+)\s+area\s+(\d+)'
            networks = re.findall(network_pattern, ospf_config)
            for network, wildcard, area in networks:
                ospf_data['networks'].append({
                    'network': network,
                    'wildcard': wildcard,
                    'area': area
                })
                if area not in ospf_data['areas']:
                    ospf_data['areas'].append(area)
                    
            device.add_routing_protocol('ospf', ospf_data)

class ArubaConfigParser:
    """Parser for Aruba OS-CX configuration files"""
    
    def parse_config(self, config_text: str, filename: str) -> Optional[DeviceConfig]:
        """Parse Aruba OS-CX configuration text"""
        # Extract hostname
        hostname_match = re.search(r'^hostname\s+(\S+)', config_text, re.MULTILINE)
        if not hostname_match:
            print(f"No hostname found in {filename}")
            return None
            
        hostname = hostname_match.group(1)
        device = DeviceConfig(hostname, filename)
        device.device_type = "switch"  # Default for Aruba switches
        
        # Extract device model from version line
        version_match = re.search(r'!Version AOS-CX (.+)', config_text)
        if version_match:
            device.model = f"AOS-CX {version_match.group(1)}"
            
        # Parse interfaces
        self._parse_interfaces(config_text, device)
        
        # Parse routing protocols
        self._parse_routing_protocols(config_text, device)
        
        return device
        
    def _parse_interfaces(self, config_text: str, device: DeviceConfig):
        """Parse Aruba interface configurations"""
        # Find all interface blocks - Aruba uses different indentation
        interface_pattern = r'^interface\s+(\S+.*?)\n((?:(?:^\s{4}.*|^\s*$)\n)*)'
        interfaces = re.findall(interface_pattern, config_text, re.MULTILINE)
        
        for intf_name, intf_config in interfaces:
            intf_name = intf_name.strip()
            config_dict = {
                'name': intf_name,
                'status': 'up',  # Default
                'description': '',
                'ip_address': '',
                'subnet_mask': '',
                'negotiation': '',
                'other_config': [],
                'lag_member': False,
                'lag_id': None
            }
            
            # Parse IP address with CIDR notation
            ip_match = re.search(r'^\s*ip address\s+(\S+/\d+)', intf_config, re.MULTILINE)
            if ip_match:
                ip_cidr = ip_match.group(1)
                try:
                    interface_ip = ipaddress.IPv4Interface(ip_cidr)
                    config_dict['ip_address'] = str(interface_ip.ip)
                    config_dict['subnet_mask'] = str(interface_ip.network.netmask)
                except:
                    # If parsing fails, store as-is
                    config_dict['ip_address'] = ip_cidr
                    config_dict['subnet_mask'] = ''
            
            # Check for DHCP
            if 'ip dhcp' in intf_config:
                config_dict['ip_address'] = 'dhcp'
                config_dict['subnet_mask'] = ''
                
            # Parse LAG membership
            lag_match = re.search(r'^\s*lag\s+(\d+)', intf_config, re.MULTILINE)
            if lag_match:
                config_dict['lag_member'] = True
                config_dict['lag_id'] = lag_match.group(1)
                
            # Parse shutdown status
            if 'no shutdown' not in intf_config:
                config_dict['status'] = 'down'
                
            # Store other configuration lines
            for line in intf_config.split('\n'):
                line = line.strip()
                if line and not line.startswith('!') and 'ip address' not in line and 'no shutdown' not in line:
                    config_dict['other_config'].append(line)
            
            # Add LAG information for D2 compatibility
            if intf_name.startswith('lag'):
                config_dict['port_channel'] = True
                config_dict['protocol'] = 'LACP'  # Aruba LAG uses LACP
                
            # Categorize interface
            if intf_name.startswith('loopback'):
                device.add_loopback(intf_name, config_dict)
            else:
                device.add_interface(intf_name, config_dict)
                
    def _parse_routing_protocols(self, config_text: str, device: DeviceConfig):
        """Parse Aruba routing protocol configurations"""
        # Parse OSPF - Aruba format is similar but simpler
        ospf_match = re.search(r'^router ospf\s+(\d+)\s*\n((?:(?:^\s{4}.*|^\s*$)\n)*)', 
                              config_text, re.MULTILINE)
        if ospf_match:
            process_id = ospf_match.group(1)
            ospf_config = ospf_match.group(2)
            
            ospf_data = {
                'process_id': process_id,
                'router_id': '',
                'networks': [],
                'areas': []
            }
            
            # Parse router-id
            router_id_match = re.search(r'^\s*router-id\s+(\S+)', ospf_config, re.MULTILINE)
            if router_id_match:
                ospf_data['router_id'] = router_id_match.group(1)
                
            # Parse areas
            area_match = re.search(r'^\s*area\s+(\S+)', ospf_config, re.MULTILINE)
            if area_match:
                ospf_data['areas'].append(area_match.group(1))
                    
            device.add_routing_protocol('ospf', ospf_data)
            
        # Parse interface-level OSPF (Aruba assigns OSPF to interfaces directly)
        interface_ospf_pattern = r'interface\s+(\S+.*?)\n((?:(?:^\s{4}.*|^\s*$)\n)*)'
        interface_blocks = re.findall(interface_ospf_pattern, config_text, re.MULTILINE)
        
        ospf_interfaces = []
        for intf_name, intf_config in interface_blocks:
            ospf_match = re.search(r'ip ospf\s+(\d+)\s+area\s+(\S+)', intf_config)
            if ospf_match:
                process_id = ospf_match.group(1)
                area = ospf_match.group(2)
                ospf_interfaces.append({
                    'interface': intf_name.strip(),
                    'process_id': process_id,
                    'area': area
                })
                
        if ospf_interfaces:
            # Update or create OSPF data with interface information
            if 'ospf' not in device.routing_protocols:
                device.add_routing_protocol('ospf', {
                    'process_id': ospf_interfaces[0]['process_id'],
                    'router_id': '',
                    'networks': [],
                    'areas': list(set([intf['area'] for intf in ospf_interfaces])),
                    'interfaces': ospf_interfaces
                })
            else:
                device.routing_protocols['ospf']['interfaces'] = ospf_interfaces

class D2Generator:
    """Generates D2 files from parsed device configurations"""
    
    def __init__(self, devices: Dict[str, DeviceConfig]):
        self.devices = devices
        
    def generate_d2_files(self, output_dir: Path, site_info: Dict = None):
        """Generate main.d2 and individual device .d2 files"""
        if site_info is None:
            site_info = {
                'name': 'GNS3 Lab Network',
                'location': 'Lab Environment',
                'description': 'Network topology generated from GNS3 device configurations'
            }
        
        # Generate individual device files
        self._generate_device_files(output_dir)
        
        # Generate main.d2 file
        self._generate_main_file(output_dir, site_info)
        
        print(f"Generated {len(self.devices)} device files and main.d2 in {output_dir}")
        
    def _generate_main_file(self, output_dir: Path, site_info: Dict):
        """Generate main.d2 with device list and connections"""
        main_content = []
        
        # Header comments
        main_content.append(f"# {site_info['name']}")
        main_content.append(f"# Location: {site_info['location']}")
        main_content.append(f"# Description: {site_info['description']}")
        main_content.append(f"# Device Count: {len(self.devices)} devices")
        main_content.append("")
        
        # Device list - references to individual device files
        main_content.append("# Device List - Individual device configurations are in separate .d2 files")
        main_content.append("devices: {")
        for hostname in sorted(self.devices.keys()):
            main_content.append(f"  {hostname}")
        main_content.append("}")
        main_content.append("")
        
        # Connections
        main_content.append("# Connection Topology - All site connections defined here")
        main_content.append("# This prevents duplicate connections across device files")
        main_content.append("")
        
        connections = self._detect_connections()
        for connection in connections:
            main_content.append(f"{connection['device1']}.{connection['interface1']} -> "
                              f"{connection['device2']}.{connection['interface2']}")
        
        # Write main.d2
        main_file = output_dir / "main.d2"
        with open(main_file, 'w') as f:
            f.write('\n'.join(main_content))
            
    def _generate_device_files(self, output_dir: Path):
        """Generate individual device .d2 files"""
        # Create devices subdirectory if it doesn't exist
        devices_dir = output_dir / "devices"
        devices_dir.mkdir(exist_ok=True)
        
        for hostname, device in self.devices.items():
            device_content = []
            
            # Header comment
            device_content.append(f"# {hostname} - {device.model}")
            
            # Device definition
            device_content.append(f"{hostname}: {{")
            device_content.append(f'  label: "{hostname}"')
            
            # Determine device type
            device_type = self._determine_device_type(device)
            device_content.append(f'  type: "{device_type}"')
            
            if device.model:
                device_content.append(f'  model: "{device.model}"')
                
            # Management IP
            mgmt_ip = self._get_management_ip(device)
            if mgmt_ip:
                device_content.append(f'  mgmt_ip: "{mgmt_ip}"')
                
            device_content.append("")
            device_content.append("  # Interface Configuration")
            
            # Add interfaces
            for intf_name, intf_config in device.interfaces.items():
                if intf_config['ip_address'] and intf_config['status'] != 'no_ip':
                    device_content.append(f"  {intf_name}: {{")
                    
                    # Add description if available
                    if intf_config['description']:
                        device_content.append(f'    description: "{intf_config["description"]}"')
                    
                    # Add basic interface properties
                    device_content.append(f'    switchport_mode: "routed"')
                    device_content.append(f'    status: "up"')
                    device_content.append(f'    bandwidth: "1Gbps"')  # Default for GigE interfaces
                    device_content.append(f'    ip_address: "{intf_config["ip_address"]}"')
                    device_content.append(f'    subnet_mask: "{intf_config["subnet_mask"]}"')
                    
                    # Add port channel information for LAG interfaces
                    if intf_config.get('port_channel'):
                        device_content.append(f'    protocol: "LACP"')
                        device_content.append(f'    port_channel: "true"')
                    
                    # Add OSPF properties if device has OSPF enabled
                    if 'ospf' in device.routing_protocols:
                        ospf_config = device.routing_protocols['ospf']
                        # Find the OSPF network that matches this interface
                        intf_network = self._get_interface_network(intf_config)
                        ospf_area = self._find_ospf_area_for_network(intf_network, ospf_config)
                        if ospf_area:
                            device_content.append(f'    ospf_area: "{ospf_area}"')
                            device_content.append(f'    ospf_cost: "10"')  # Default cost
                            device_content.append(f'    ospf_network_type: "point-to-point"')
                    
                    device_content.append("  }")
                    
            # Add routing protocols
            if device.routing_protocols:
                device_content.append("")
                device_content.append("  # Routing Configuration")
                for protocol, config in device.routing_protocols.items():
                    if protocol == 'bgp':
                        device_content.append(f"  bgp_enabled: \"true\"")
                        device_content.append(f'  bgp_as: "{config["asn"]}"')
                        # Format neighbors as comma-separated string as expected by frontend
                        neighbor_list = [f"{neighbor['ip']} AS{neighbor['remote_asn']}" for neighbor in config['neighbors']]
                        device_content.append(f'  bgp_neighbors: "{", ".join(neighbor_list)}"')
                    elif protocol == 'ospf':
                        device_content.append(f"  ospf_enabled: \"true\"")
                        device_content.append(f'  ospf_process_id: "{config["process_id"]}"')
                        device_content.append(f'  ospf_router_id: "{config["router_id"]}"')
                        if config['areas']:
                            device_content.append(f'  ospf_areas: "{",".join(config["areas"])}"')
                            
            device_content.append("}")
            
            # Write device file to devices subdirectory
            device_file = devices_dir / f"{hostname}.d2"
            with open(device_file, 'w') as f:
                f.write('\n'.join(device_content))
                
        print(f"Generated individual device files: {', '.join(self.devices.keys())}")
        
    def _get_interface_network(self, intf_config):
        """Get network address for interface"""
        try:
            import ipaddress
            network = ipaddress.IPv4Network(
                f"{intf_config['ip_address']}/{intf_config['subnet_mask']}", 
                strict=False
            )
            return str(network.network_address)
        except:
            return None
            
    def _find_ospf_area_for_network(self, intf_network, ospf_config):
        """Find OSPF area for a given network"""
        if not intf_network or not ospf_config.get('networks'):
            return None
            
        for network_config in ospf_config['networks']:
            network_addr = network_config['network']
            if intf_network == network_addr:
                return network_config['area']
        return None
        
    def _generate_device_definitions(self) -> List[str]:
        """Generate device definition blocks"""
        lines = []
        
        for hostname, device in self.devices.items():
            lines.append(f"{hostname}: {{")
            lines.append(f'  label: "{hostname}"')
            
            # Determine device type based on model or configuration
            device_type = self._determine_device_type(device)
            lines.append(f'  type: "{device_type}"')
            
            if device.model:
                lines.append(f'  model: "{device.model}"')
                
            # Add management IP (usually loopback0)
            mgmt_ip = self._get_management_ip(device)
            if mgmt_ip:
                lines.append(f'  mgmt_ip: "{mgmt_ip}"')
                
            # Add interfaces
            for intf_name, intf_config in device.interfaces.items():
                if intf_config['ip_address'] and intf_config['status'] != 'no_ip':  # Only include interfaces with IP addresses
                    lines.append(f"  {intf_name}: {{")
                    if intf_config['description']:
                        lines.append(f'    description: "{intf_config["description"]}"')
                    lines.append(f'    ip_address: "{intf_config["ip_address"]}"')
                    lines.append(f'    subnet_mask: "{intf_config["subnet_mask"]}"')
                    lines.append(f'    status: "up"')
                    lines.append("  }")
                    
            # Add routing protocols
            for protocol, config in device.routing_protocols.items():
                if protocol == 'bgp':
                    lines.append(f"  routing: {{")
                    lines.append(f'    bgp: {{')
                    lines.append(f'      asn: "{config["asn"]}"')
                    lines.append(f'      neighbors: [')
                    for neighbor in config['neighbors']:
                        lines.append(f'        "{neighbor["ip"]} AS{neighbor["remote_asn"]}"')
                    lines.append(f'      ]')
                    lines.append(f'    }}')
                    lines.append(f"  }}")
                    
            lines.append("}")
            lines.append("")
            
        return lines
        
    def _generate_connections(self) -> List[str]:
        """Generate connection definitions by analyzing IP subnets"""
        lines = ["# Connections"]
        connections = self._detect_connections()
        
        for connection in connections:
            lines.append(f"{connection['device1']}.{connection['interface1']} -> "
                        f"{connection['device2']}.{connection['interface2']}")
            
        return lines
        
    def _detect_connections(self) -> List[Dict]:
        """Detect connections between devices based on IP subnets"""
        connections = []
        
        # Build a list of all interfaces with IP addresses
        all_interfaces = []
        for hostname, device in self.devices.items():
            for intf_name, intf_config in device.interfaces.items():
                if intf_config['ip_address'] and intf_config['subnet_mask']:
                    try:
                        network = ipaddress.IPv4Network(
                            f"{intf_config['ip_address']}/{intf_config['subnet_mask']}", 
                            strict=False
                        )
                        all_interfaces.append({
                            'device': hostname,
                            'interface': intf_name,
                            'ip': intf_config['ip_address'],
                            'network': network
                        })
                    except:
                        continue
                        
        # Find interfaces on the same subnet
        for i, intf1 in enumerate(all_interfaces):
            for intf2 in all_interfaces[i+1:]:
                if (intf1['network'] == intf2['network'] and 
                    intf1['device'] != intf2['device']):
                    connections.append({
                        'device1': intf1['device'],
                        'interface1': intf1['interface'],
                        'device2': intf2['device'],
                        'interface2': intf2['interface'],
                        'subnet': str(intf1['network'])
                    })
                    
        return connections
        
    def _determine_device_type(self, device: DeviceConfig) -> str:
        """Determine device type based on model and configuration"""
        # Cisco devices
        if device.model in ['CSR1000V', 'ISR4331', 'ISR4321', 'ISR4451']:
            return 'router'
        elif device.model in ['C9300', 'C3850', 'C2960']:
            return 'switch'
        # Aruba devices
        elif 'AOS-CX' in device.model:
            return 'switch'  # Aruba OS-CX devices are typically switches
        elif 'WLC' in device.model or 'wireless' in device.hostname.lower():
            return 'wireless_controller'
        elif 'firewall' in device.hostname.lower() or 'asa' in device.model.lower():
            return 'firewall'
        else:
            # Use the device_type set by the parser, or default based on configuration
            if hasattr(device, 'device_type') and device.device_type:
                return device.device_type
            elif device.routing_protocols:
                return 'router'
            else:
                return 'switch'
                
    def _get_management_ip(self, device: DeviceConfig) -> Optional[str]:
        """Get management IP address (usually Loopback0)"""
        if 'Loopback0' in device.loopbacks:
            return device.loopbacks['Loopback0'].get('ip_address')
        return None

def main():
    """Main function to parse configs and generate D2 files"""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Parse Cisco configs and generate D2 topology files')
    parser.add_argument('--config-dir', '-c', required=True, 
                       help='Directory containing .conf files')
    parser.add_argument('--output-dir', '-o', required=True,
                       help='Output directory for D2 files')
    parser.add_argument('--site-name', '-n', default='Network Topology',
                       help='Site name for the topology')
    parser.add_argument('--location', '-l', default='Unknown',
                       help='Site location')
    parser.add_argument('--description', '-d', default='Auto-generated from device configurations',
                       help='Site description')
    
    args = parser.parse_args()
    
    config_dir = Path(args.config_dir)
    output_dir = Path(args.output_dir)
    
    if not config_dir.exists():
        print(f"Config directory not found: {config_dir}")
        sys.exit(1)
        
    if not output_dir.exists():
        output_dir.mkdir(parents=True, exist_ok=True)
        
    print(f"Parsing configurations from: {config_dir}")
    print(f"Output directory: {output_dir}")
    
    # Parse configurations
    config_parser = ConfigParser(config_dir)
    devices = config_parser.parse_all_configs()
    
    if not devices:
        print("No devices found or parsed successfully")
        sys.exit(1)
        
    print(f"Parsed {len(devices)} devices:")
    for hostname, device in devices.items():
        protocols = list(device.routing_protocols.keys())
        print(f"  - {hostname} ({device.model}) - Protocols: {', '.join(protocols) if protocols else 'None'}")
        
    # Generate D2 files
    generator = D2Generator(devices)
    generator.generate_d2_files(output_dir, {
        'name': args.site_name,
        'location': args.location,
        'description': args.description
    })
    
if __name__ == "__main__":
    main()