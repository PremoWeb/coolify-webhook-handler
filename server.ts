import { serve } from "bun";
import crypto from "crypto";

// Extract the repository name and branch from the payload
function extractRepoInfo(payload: {
  repository: { full_name: string };
  ref: string;
}) {
  const repoName = payload?.repository?.full_name; // Repository name is in 'full_name'
  const branch = payload?.ref?.split("/").pop(); // Branch name is after 'refs/heads/'
  return { repoName, branch };
}

const apiUrl = `${process.env.COOLIFY_API_URL}/api/v1`;
const token = `Bearer ${process.env.COOLIFY_API_KEY}`;
const secret = process.env.WEBHOOKS_SECRET!;

// Function to verify HMAC signature
function verifyHmacSignature(
  payload: string, // Raw payload as string (excluding the 'secret' field)
  headerSignature: string,
  secretKey: string
): boolean {
  // Parse the payload and extract the 'secret'
  const parsedPayload = JSON.parse(payload);
  const secretFromPayload = parsedPayload.secret;
  delete parsedPayload.secret; // Remove the secret from the payload for signature calculation

  // Rebuild the payload as a string (this is the raw payload to verify)
  const stringifiedPayload = JSON.stringify(parsedPayload);

  // Calculate the HMAC hash of the modified payload
  const calculatedSignature = crypto
    .createHmac("sha256", secretFromPayload || secretKey) // Use the secret from the payload or default to the server's secret
    .update(stringifiedPayload)
    .digest("hex");

  return calculatedSignature === headerSignature;
}

// Function to fetch the API list
async function getApiList(): Promise<any[]> {
  const url = `${apiUrl}/applications`; // Adjust to your actual API endpoint for the list

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: token,
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error fetching API list:", err.message);
      throw err;
    }
    console.error("Unexpected error fetching API list:", err);
    throw new Error("Unexpected error occurred while fetching API list");
  }
}

// Function to trigger a Coolify webhook
async function triggerWebhook(uuid: string, force: boolean): Promise<any> {
  const url = `${apiUrl}/deploy?uuid=${uuid}&force=${force}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error triggering the webhook:", err.message);
      throw err;
    }
    console.error("Unexpected error triggering the webhook:", err);
    throw new Error("Unexpected error occurred while triggering the webhook");
  }
}

// Handle the request

serve({
  port: 3000,
  async fetch(req) {
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type")?.toLowerCase();

      if (contentType !== "application/json") {
        return new Response(
          JSON.stringify({ error: "Content-Type must be application/json" }),
          { status: 400 }
        );
      }

      try {
        // Get the raw payload
        const payload = await req.text();

        // Extract the signature from the header
        const headerSignature = req.headers.get("x-gitea-signature");

        // Verify HMAC signature
        if (headerSignature) {
          const isValidSignature = verifyHmacSignature(
            payload,
            headerSignature,
            secret
          );

          if (!isValidSignature) {
            console.error("Invalid HMAC signature");
            return new Response(
              JSON.stringify({ error: "Invalid signature" }),
              {
                status: 403,
              }
            );
          }
        }

        const parsedPayload = JSON.parse(payload);
        const { repoName, branch } = extractRepoInfo(parsedPayload);

        if (!repoName || !branch) {
          return new Response(
            JSON.stringify({ error: "Missing repository name or branch" }),
            { status: 400 }
          );
        }

        console.log(`Repository from Payload: ${repoName}`);
        console.log(`Branch from Payload: ${branch}`);

        const apiList = await getApiList();

        const matchedRepo = apiList.find(
          (item: { git_repository: string; git_branch: string }) => {
            const trimmedRepoName = repoName.trim().toLowerCase();
            const trimmedApiRepo = item.git_repository?.trim().toLowerCase();
            const apiBranch = item.git_branch?.trim().toLowerCase();

            return (
              trimmedRepoName === trimmedApiRepo &&
              apiBranch === branch.toLowerCase()
            );
          }
        );

        if (matchedRepo) {
          console.log(
            `Match Found! Repository: ${matchedRepo.git_repository}, Branch: ${branch}`
          );

          // Uncomment this to trigger the webhook
          await triggerWebhook(matchedRepo.uuid, false);

          return new Response(
            JSON.stringify({
              message: "Deployment triggered successfully",
            }),
            { status: 200 }
          );
        } else {
          console.log(
            "No matching repository and branch found in the API list."
          );
          return new Response(
            JSON.stringify({ error: "No matching repository and branch" }),
            { status: 404 }
          );
        }
      } catch (err) {
        if (err instanceof SyntaxError) {
          console.error("Error parsing JSON:", err.message);
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
          });
        } else if (err instanceof Error) {
          console.error("Error processing request:", err.message);
          return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500 }
          );
        } else {
          console.error("Unexpected error:", err);
          return new Response(
            JSON.stringify({ error: "Internal Server Error" }),
            { status: 500 }
          );
        }
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running at http://localhost:3000/");
