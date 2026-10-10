/**
 * Who may talk to the app: the home network only.
 *
 * The app has no login. As a second line of defence behind the router it answers only private
 * address ranges and the networks the Pi itself is attached to (that matters with IPv6, where
 * the Pi has a global address).
 */

import { BlockList, isIPv4, isIPv6 } from "node:net";
import { networkInterfaces } from "node:os";

const PRIVATE = new BlockList();
PRIVATE.addSubnet("10.0.0.0", 8, "ipv4");
PRIVATE.addSubnet("172.16.0.0", 12, "ipv4");
PRIVATE.addSubnet("192.168.0.0", 16, "ipv4");
PRIVATE.addSubnet("127.0.0.0", 8, "ipv4"); // loopback
PRIVATE.addSubnet("169.254.0.0", 16, "ipv4"); // link-local
PRIVATE.addAddress("::1", "ipv6");
PRIVATE.addSubnet("fc00::", 7, "ipv6"); // unique local addresses
PRIVATE.addSubnet("fe80::", 10, "ipv6"); // link-local

const LOCAL_SECONDS = 60;
let local = { at: -Infinity, nets: new BlockList() };

/** Networks the Pi is directly attached to (for IPv6 with global addresses). */
function localNetworks(): BlockList {
  if (performance.now() / 1000 - local.at > LOCAL_SECONDS) {
    const nets = new BlockList();
    for (const addresses of Object.values(networkInterfaces())) {
      for (const { address, cidr, family } of addresses ?? []) {
        const prefix = Number(cidr?.split("/")[1]);
        if (Number.isInteger(prefix)) {
          nets.addSubnet(address, prefix, family === "IPv6" ? "ipv6" : "ipv4");
        }
      }
    }
    local = { at: performance.now() / 1000, nets };
  }
  return local.nets;
}

/** `nets`: the networks of this computer; only tests pass their own. */
export function isHomeNetwork(remote: string | undefined, nets: BlockList = localNetworks()): boolean {
  let ip = (remote ?? "").split("%")[0];
  // IPv4 that arrived on the IPv6 socket
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) {
    ip = mapped[1];
  }
  const family = isIPv4(ip) ? "ipv4" : isIPv6(ip) ? "ipv6" : null;
  if (family === null) {
    return false;
  }
  return PRIVATE.check(ip, family) || nets.check(ip, family);
}
