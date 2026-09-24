import { Router } from "express";
import { prisma } from "../db/prisma";

export const geoRouter = Router();

geoRouter.get("/countries", async (_req, res, next) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, iso2: true },
    });
    return res.json({ countries });
  } catch (err) {
    return next(err);
  }
});

geoRouter.get("/countries/:iso2/states", async (req, res, next) => {
  try {
    const iso2 = String(req.params.iso2 || "").toUpperCase();
    if (!iso2) {
      return res.status(400).json({ error: "Country ISO2 is required" });
    }
    const states = await prisma.state.findMany({
      where: { countryIso2: iso2 },
      orderBy: { name: "asc" },
      select: { id: true, name: true, iso2: true, countryIso2: true },
    });
    return res.json({ states });
  } catch (err) {
    return next(err);
  }
});
