import("multer")
  .then(() => import("@supabase/supabase-js"))
  .then(() => {
    console.log("mods_ok");
    console.log("URL", process.env.SUPABASE_URL ? "set" : "missing");
    console.log("BUCKET", process.env.SUPABASE_STORAGE_BUCKET || "missing");
  })
  .catch((error) => {
    console.error("FAIL", error.message);
    process.exit(1);
  });
