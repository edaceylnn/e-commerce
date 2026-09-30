import { downloadImage, isPublicAddress } from "@/lib/remote-image";

describe("remote image guard", () => {
  it("tells public addresses from internal ones", () => {
    for (const ip of ["8.8.8.8", "151.101.1.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPublicAddress(ip)).toBe(true);
    }
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.10",
      "169.254.169.254", // cloud metadata
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "not-an-ip",
    ]) {
      expect(isPublicAddress(ip)).toBe(false);
    }
  });

  it("refuses non-https, odd ports, credentials and internal hosts before fetching", async () => {
    await expect(downloadImage("http://cdn.example.com/a.jpg")).rejects.toThrow(/https/);
    await expect(downloadImage("https://cdn.example.com:8443/a.jpg")).rejects.toThrow(/port/);
    await expect(downloadImage("https://user:pw@cdn.example.com/a.jpg")).rejects.toThrow(/kullanıcı/);
    await expect(downloadImage("https://127.0.0.1/a.jpg")).rejects.toThrow(/iç ağa/);
    await expect(downloadImage("https://[::1]/a.jpg")).rejects.toThrow(/iç ağa/);
    await expect(downloadImage("https://169.254.169.254/latest/meta-data")).rejects.toThrow(/iç ağa/);
  });
});
