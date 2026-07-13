const PROJECT_PREFIX = "roomify_project_";

const jsonError = (status, message, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();

    console.log("Worker authenticated user:", user);

    return user?.uuid || null;
  } catch (e) {
    console.error("Worker auth failed:", e);
    return null;
  }
};


router.post("/api/projects/save", async ({ request, user }) => {
  try {
    console.log("========== SAVE ==========");

    const body = await request.json();
    const project = body?.project;

    const userPuter = user?.puter;

    console.log("user =", user);
    console.log("userPuter =", userPuter);

    if (!userPuter) {
      return jsonError(401, "Unauthorized");
    }

    const userId = await getUserId(userPuter);

    if (!userId) {
      return jsonError(401, "Unauthorized");
    }

    if (!project?.id || !project?.sourceImage) {
      return jsonError(400, "Project ID and source image are required");
    }

    const payload = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    const key = `${PROJECT_PREFIX}${project.id}`;

    await userPuter.kv.set(key, payload);

    return {
      saved: true,
      id: project.id,
      project: payload,
    };
  } catch (e) {
    return jsonError(500, "Failed to save project", {
      message: e.message,
    });
  }
});

router.get("/api/projects/list", async ({ user }) => {
  try {
    const userPuter = user?.puter;

    if (!userPuter) {
      return jsonError(401, "Unauthorized");
    }

    const userId = await getUserId(userPuter);

    if (!userId) {
      return jsonError(401, "Unauthorized");
    }

    const projects = (await userPuter.kv.list(PROJECT_PREFIX, true)).map(
        ({ value }) => ({
          ...value,
          isPublic: true,
        })
    );

    return { projects };
  } catch (e) {
    return jsonError(500, "Failed to list projects", {
      message: e.message || "Unknown error",
    });
  }
});
router.get("/api/projects/get", async ({ request, user }) => {
  try {
    const userPuter = user?.puter;

    if (!userPuter) {
      return jsonError(401, "Unauthorized");
    }

    const userId = await getUserId(userPuter);

    if (!userId) {
      return jsonError(401, "Unauthorized");
    }

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return jsonError(400, "Missing project id");
    }

    const key = `${PROJECT_PREFIX}${id}`;

    const project = await userPuter.kv.get(key);

    if (!project) {
      return jsonError(404, "Project not found");
    }

    return { project };
  } catch (e) {
    return jsonError(500, "Failed to get project", {
      message: e.message || "Unknown error",
    });
  }
});

router.get("/api/test", async ({ user }) => {
  return new Response(
      JSON.stringify({
        success: true,
        hasUser: !!user,
        hasPuter: !!user?.puter,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
  );
});