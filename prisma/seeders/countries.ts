import { Country, State } from "country-state-city";

const countryList = Country.getAllCountries();
const stateList = State.getAllStates();

const countries = countryList.map((country) => {
  return {
    id: country.isoCode,
    name: country.name,
    createdAt: new Date(),
  };
});

countries.push({
  id: "unspecified",
  name: "Not specified",
  createdAt: new Date(),
});

const states = stateList.map((state) => {
  return {
    id: state.isoCode,
    name: state.name,
    countryCode: state.countryCode,
    createdAt: new Date(),
  };
});

states.push({
  id: "unspecified",
  name: "Not specified",
  countryCode: "unspecified",
  createdAt: new Date(),
});

export { countries, states };
