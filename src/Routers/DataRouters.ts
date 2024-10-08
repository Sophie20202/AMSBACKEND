import { Router } from "express";
import { getGenders } from "../controllers/DataControllers/GenderController";
import {
  getCountries,
  getDistrict,
  getDistricts,
  getSector,
  getSectors,
  getSectorsByDistrict,
  getStates,
  getStatesByCountry,
} from "../controllers/DataControllers/LocationController";
import {
  addCohorts,
  deleteCohorts,
  getCohorts,
} from "../controllers/DataControllers/CohortController";
import {
  addTrack,
  deleteTracks,
  getTracks,
} from "../controllers/DataControllers/TrackController";
import {
  addWorkingSector,
  deleteWorkingSector,
  getWorkingSector,
} from "../controllers/DataControllers/WorkingSector";

const router = Router();

router.get("/genders", getGenders);
router.get("/tracks", getTracks);
router.post("/tracks", addTrack);
router.delete("/track/:id", deleteTracks);
router.get("/working-sectors", getWorkingSector);
router.post("/working-sectors", addWorkingSector);
router.delete("/working-sector/:id", deleteWorkingSector);
router.get("/countries", getCountries);
router.get("/states", getStates);
router.get("/states/:countryId", getStatesByCountry);
router.get("/districts", getDistricts);
router.get("/cohorts", getCohorts);
router.post("/cohort", addCohorts);
router.delete("/cohort/:id", deleteCohorts);
router.get("/district/:districtId", getDistrict);
router.get("/district/sector/:districtName", getSectorsByDistrict);
router.get("/sectors", getSectors);
router.get("/sector/:sectorId", getSector);

export default router;
