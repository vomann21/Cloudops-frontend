import { Configuration, LogLevel } from "@azure/msal-browser";

// MSAL frontend config (correct for RBAC + backend auth)
export const msalConfig: Configuration = {
  auth: {
    clientId: "ef47a677-7ee7-4f43-884d-a84313eacd5d", // Frontend App Registration
    authority:
      "https://login.microsoftonline.com/3c8ea0e4-127c-4a02-ac65-58830e4ac608",
    redirectUri: "http://localhost:8080",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error(message);
      },
      logLevel: LogLevel.Info,
    },
  },
};

// User token → sent to backend → backend extracts groups → backend uses SP
export const loginRequest = {
  scopes: [
    "api://9f25b3b5-9b43-47cf-b9e7-4df2cdeb6656/access_as_user", // Backend exposed API scope
    "openid",
    "profile",
  ],
};