import { Router, Request, Response } from "express";
import { getPortfolioForAddress } from "../lib/zerion.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function createPortfolioRouter(): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const address = (req.query.address ?? req.query.safeAddress) as string | undefined;
      if (!address || !ADDRESS_RE.test(address)) {
        res.status(400).json({ error: "Missing or invalid address (query: address or safeAddress)" });
        return;
      }
      const portfolio = await getPortfolioForAddress(address);
      res.json(portfolio);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Portfolio error:", message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
