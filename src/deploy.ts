#!/usr/bin/env deno run --allow-read --allow-write --allow-net --allow-env

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

interface ValManifest {
  vals: {
    [key: string]: {
      id: string | null;
      name: string;
      url: string | null;
      type?: string;
    };
  };
}

async function loadManifest(): Promise<ValManifest> {
  const manifestPath = join(Deno.cwd(), "val-manifest.json");
  const content = await Deno.readTextFile(manifestPath);
  return JSON.parse(content);
}

async function saveManifest(manifest: ValManifest): Promise<void> {
  const manifestPath = join(Deno.cwd(), "val-manifest.json");
  await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function getValContent(valName: string): Promise<string> {
  // Special handling for the shared server module
  if (valName === "mcp-server-shared" || valName === "mcp-server") {
    const sharedPath = join(Deno.cwd(), "src/shared/mcp-server.ts");
    return await Deno.readTextFile(sharedPath);
  }

  // Read the val entry file
  const valPath = join(Deno.cwd(), `src/vals/${valName}.ts`);
  const valContent = await Deno.readTextFile(valPath);

  // For deployment, we don't need to bundle - just return the content as-is
  // Val Town will handle the imports
  return valContent;
}

async function getValTownToken(): Promise<string> {
  // Try to get token from environment
  let token = Deno.env.get("VAL_TOWN_TOKEN");

  if (!token) {
    // Try to read from .env file
    try {
      const envContent = await Deno.readTextFile(".env");
      const match = envContent.match(/VAL_TOWN_TOKEN=(.+)/);
      if (match) {
        token = match[1].trim();
      }
    } catch {
      // .env file doesn't exist
    }
  }

  if (!token) {
    throw new Error("Val Town token not found. Set VAL_TOWN_TOKEN environment variable or add it to .env file");
  }

  return token;
}

async function createVal(name: string, code: string, type: string, token: string): Promise<string> {
  // First create the val
  const createResponse = await fetch("https://api.val.town/v2/vals", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      privacy: "public",
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create val: ${error}`);
  }

  const val = await createResponse.json();

  // Determine the file name - for new vals, we need to use the main file
  const fileName = type === "script" ? "main.ts" : "http.ts";

  // Then create the file (new vals don't have files yet)
  const updateResponse = await fetch(`https://api.val.town/v2/vals/${val.id}/files?path=${fileName}`, {
    method: "POST",  // Use POST to create the file
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: code,
      type: type,
    }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to create val file: ${error}`);
  }

  return val.id;
}

async function updateVal(valId: string, code: string, type: string, token: string): Promise<void> {
  // Determine the file name - use main.ts for scripts, http.ts for HTTP vals
  const fileName = type === "script" ? "main.ts" : "http.ts";

  // First try to update the file
  const response = await fetch(`https://api.val.town/v2/vals/${valId}/files?path=${fileName}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: code,
      type: type,
    }),
  });

  if (!response.ok) {
    // If the file doesn't exist (404), try to create it
    if (response.status === 404) {
      const createResponse = await fetch(`https://api.val.town/v2/vals/${valId}/files?path=${fileName}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: code,
          type: type,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create val file: ${error}`);
      }
    } else {
      const error = await response.text();
      throw new Error(`Failed to update val: ${error}`);
    }
  }
}

async function deployVal(valKey: string): Promise<void> {
  console.log(`\nDeploying ${valKey}...`);

  const manifest = await loadManifest();
  const valInfo = manifest.vals[valKey];

  if (!valInfo) {
    throw new Error(`Val ${valKey} not found in manifest`);
  }

  // Skip the standalone shared server val
  if (valKey === "mcp-server-shared") {
    console.log("Skipping standalone shared server val");
    return;
  }

  const token = await getValTownToken();
  const valContent = await getValContent(valKey);
  const valType = valInfo.type || "http";

  if (!valInfo.id) {
    // Create new val
    console.log(`Creating new val: ${valInfo.name}`);
    const valId = await createVal(valInfo.name, valContent, valType, token);
    manifest.vals[valKey].id = valId;
    await saveManifest(manifest);
    console.log(`✅ Created val with ID: ${valId}`);
  } else {
    // Update existing val
    console.log(`Updating val: ${valInfo.name} (${valInfo.id})`);
    await updateVal(valInfo.id, valContent, valType, token);
    console.log(`✅ Updated val: ${valInfo.id}`);
  }

  // Deploy the shared server file to this val
  console.log(`Adding shared server file to val...`);
  const sharedPath = join(Deno.cwd(), "src/shared/mcp-server.ts");
  const sharedContent = await Deno.readTextFile(sharedPath);

  // Create or update the mcp-server.ts file in the val
  const fileResponse = await fetch(`https://api.val.town/v2/vals/${valInfo.id}/files?path=mcp-server.ts`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: sharedContent,
      type: "file",
    }),
  });

  if (!fileResponse.ok) {
    // If file doesn't exist, create it
    if (fileResponse.status === 404) {
      const createResponse = await fetch(`https://api.val.town/v2/vals/${valInfo.id}/files?path=mcp-server.ts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: sharedContent,
          type: "file",
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error(`Warning: Failed to create shared server file: ${error}`);
      } else {
        console.log(`✅ Added shared server file`);
      }
    } else {
      const error = await fileResponse.text();
      console.error(`Warning: Failed to update shared server file: ${error}`);
    }
  } else {
    console.log(`✅ Updated shared server file`);
  }

  const valUrl = `https://${manifest.vals[valKey].name}.val.run/mcp`;
  manifest.vals[valKey].url = valUrl;
  await saveManifest(manifest);
  console.log(`📍 Val URL: ${valUrl}`);
}

async function main() {
  const args = Deno.args;

  if (args.length === 0) {
    console.log("Usage: deno run deploy.ts <val-key> [val-key2 ...]");
    console.log("\nAvailable vals:");
    const manifest = await loadManifest();
    for (const key of Object.keys(manifest.vals)) {
      const val = manifest.vals[key];
      console.log(`  ${key}: ${val.name} ${val.id ? `(ID: ${val.id})` : "(not deployed)"}`);
    }
    Deno.exit(0);
  }

  if (args[0] === "all") {
    const manifest = await loadManifest();
    for (const key of Object.keys(manifest.vals)) {
      await deployVal(key);
    }
  } else {
    for (const valKey of args) {
      await deployVal(valKey);
    }
  }

  console.log("\n✨ Deployment complete!");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error("❌ Error:", error.message);
    Deno.exit(1);
  }
}
