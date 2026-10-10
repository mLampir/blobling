import assert from "node:assert/strict";
import { BlockList } from "node:net";
import { test } from "node:test";

import { isHomeNetwork } from "../src/network";

const none = new BlockList();

test("private, loopback and link-local addresses are the home network", () => {
  for (const ip of ["192.168.0.42", "10.1.2.3", "172.16.0.1", "172.31.255.254", "127.0.0.1", "169.254.3.4",
    "::1", "fe80::1c2d:3e4f:5a6b:7c8d", "fe80::1%wlan0", "fd12:3456:789a::1", "::ffff:192.168.0.42"]) {
    assert.ok(isHomeNetwork(ip, none), ip);
  }
});

test("everything else is turned away", () => {
  for (const ip of ["8.8.8.8", "172.32.0.1", "192.169.0.1", "::ffff:8.8.8.8", "2001:4860:4860::8888", "", "pi",
    undefined]) {
    assert.ok(!isHomeNetwork(ip, none), String(ip));
  }
});

test("a network the Pi itself is in counts, even with global addresses", () => {
  const nets = new BlockList();
  nets.addSubnet("2a02:1234:5678:9a00:1111:2222:3333:4444", 64, "ipv6");
  nets.addSubnet("100.64.0.5", 24, "ipv4");
  assert.ok(isHomeNetwork("2a02:1234:5678:9a00::77", nets));
  assert.ok(!isHomeNetwork("2a02:1234:5678:9a01::77", nets));
  assert.ok(isHomeNetwork("100.64.0.200", nets));
  assert.ok(!isHomeNetwork("100.64.1.200", nets));
});

test("this computer's own addresses are let in", () => {
  assert.ok(isHomeNetwork("127.0.0.1"));
});
