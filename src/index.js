
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Connexion de la secrétaire
    if (request.method === "POST" && path === "/api/admin/login") {
      if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
        return json({
          success: false,
          error: "La connexion administrateur n'est pas entièrement configurée."
        }, 503);
      }

      let data;

      try {
        data = await request.json();
      } catch {
        return json({ success: false, error: "Données invalides." }, 400);
      }

      if (
        typeof data.username !== "string" ||
        typeof data.password !== "string" ||
        data.username !== env.ADMIN_USERNAME ||
        data.password !== env.ADMIN_PASSWORD
      ) {
        return json({
          success: false,
          error: "Nom d'utilisateur ou mot de passe incorrect."
        }, 401);
      }

      const expires = Date.now() + 8 * 60 * 60 * 1000;
      const payload = base64url(JSON.stringify({ exp: expires }));
      const signature = await sign(payload, env.SESSION_SECRET);
      const token = `${payload}.${signature}`;

      return json(
        { success: true, message: "Connexion réussie." },
        200,
        {
          "Set-Cookie": `fva_admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`
        }
      );
    }

    // 2. Déconnexion
    if (request.method === "POST" && path === "/api/admin/logout") {
      return json(
        { success: true },
        200,
        {
          "Set-Cookie": "fva_admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0"
        }
      );
    }

    // 3. Lecture des préinscriptions : accès réservé
    if (request.method === "GET" && path === "/api/admin/data") {
      if (!(await isAuthenticated(request, env))) {
        return json({
          success: false,
          error: "Accès non autorisé. Veuillez vous connecter."
        }, 401);
      }

      if (!env.DB) {
        return json({
          success: false,
          error: "La base de données n'est pas configurée."
        }, 503);
      }

      try {
        const individuals = await env.DB.prepare(`
          SELECT
            id,
            nom_complet,
            telephone,
            email,
            formation,
            message,
            created_at
          FROM preinscriptions
          ORDER BY created_at DESC
          LIMIT 1000
        `).all();

        const companies = await env.DB.prepare(`
          SELECT
            id,
            company_name,
            industry,
            contact_name,
            contact_title,
            phone,
            email,
            selected_modules,
            business_services,
            custom_need,
            created_at
          FROM company_preinscriptions
          ORDER BY created_at DESC
          LIMIT 1000
        `).all();

        const records = [
          ...(individuals.results || []).map(row => ({
            id: row.id,
            type: "Particulier",
            name: row.nom_complet || "",
            phone: row.telephone || "",
            email: row.email || "",
            formation: row.formation || "",
            details: row.message || "",
            createdAt: row.created_at || ""
          })),

          ...(companies.results || []).map(row => ({
            id: row.id,
            type: "Entreprise",
            name: row.company_name || "",
            phone: row.phone || "",
            email: row.email || "",
            formation: [
              ...parseList(row.selected_modules),
              ...parseList(row.business_services)
            ].join(", "),
            details: [
              row.industry ? `Secteur : ${row.industry}` : "",
              row.contact_name ? `Contact : ${row.contact_name}` : "",
              row.contact_title ? `Fonction : ${row.contact_title}` : "",
              row.custom_need ? `Besoin : ${row.custom_need}` : ""
            ].filter(Boolean).join("\n"),
            createdAt: row.created_at || ""
          }))
        ];

        records.sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt))
        );

        return json({ success: true, records });
      } catch (error) {
        return json({
          success: false,
          error: "Impossible de charger les préinscriptions. Vérifiez la structure des tables D1."
        }, 500);
      }
    }

    // 4. Préinscription d'un particulier — route existante conservée
    if (request.method === "POST" && path === "/api/preinscriptions") {
      let data;

      try {
        data = await request.json();
      } catch {
        return json({ success: false, error: "Données invalides." }, 400);
      }

      const nom = clean(data.fullName, 120);
      const telephone = clean(data.phone, 40);
      const email = clean(data.email, 120);
      const formation = clean(data.trainingProgram, 160);
      const niveau = clean(data.educationLevel, 120);

      if (!nom || !telephone || !formation || !niveau) {
        return json({
          success: false,
          error: "Veuillez renseigner tous les champs obligatoires."
        }, 400);
      }

      if (!env.DB) {
        return json({
          success: false,
          error: "La base de données n'est pas configurée."
        }, 503);
      }

      try {
        const message = `Niveau d'études : ${niveau}`;

        const result = await env.DB.prepare(`
          INSERT INTO preinscriptions
          (type_dossier, nom_complet, telephone, email, formation, message)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          "Particulier",
          nom,
          telephone,
          email || null,
          formation,
          message
        ).run();

        return json({
          success: true,
          id: result.meta.last_row_id,
          message: "Votre demande de préinscription a bien été enregistrée."
        }, 201);
      } catch (error) {
        return json({
          success: false,
          error: "Enregistrement impossible pour le moment."
        }, 500);
      }
    }

    // 5. Préinscription d'une entreprise — route existante conservée
    if (request.method === "POST" && path === "/api/company-preinscriptions") {
      let data;

      try {
        data = await request.json();
      } catch {
        return json({ success: false, error: "Données invalides." }, 400);
      }

      const companyName = clean(data.companyName, 160);
      const industry = clean(data.industry, 160);
      const contactName = clean(data.contactName, 120);
      const contactTitle = clean(data.contactTitle, 120);
      const phone = clean(data.phone, 40);
      const email = clean(data.email, 120);
      const customNeed = clean(data.customNeed, 2000);

      const selectedModules = cleanList(data.selectedModules);
      const businessServices = cleanList(data.businessServices);

      if (!companyName || !contactName || !phone) {
        return json({
          success: false,
          error: "Veuillez renseigner l'entreprise, le nom du contact et le téléphone."
        }, 400);
      }

      if (
        selectedModules.length === 0 &&
        businessServices.length === 0 &&
        !customNeed
      ) {
        return json({
          success: false,
          error: "Veuillez sélectionner un domaine, un service ou préciser votre besoin."
        }, 400);
      }

      if (!env.DB) {
        return json({
          success: false,
          error: "La base de données n'est pas configurée."
        }, 503);
      }

      try {
        const result = await env.DB.prepare(`
          INSERT INTO company_preinscriptions
          (
            company_name,
            industry,
            contact_name,
            contact_title,
            phone,
            email,
            selected_modules,
            business_services,
            custom_need
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          companyName,
          industry || null,
          contactName,
          contactTitle || null,
          phone,
          email || null,
          JSON.stringify(selectedModules),
          JSON.stringify(businessServices),
          customNeed || null
        ).run();

        return json({
          success: true,
          id: result.meta.last_row_id,
          message: "Votre demande entreprise a bien été enregistrée."
        }, 201);
      } catch (error) {
        return json({
          success: false,
          error: "Enregistrement impossible pour le moment."
        }, 500);
      }
    }

    // 6. Autres routes API inconnues
    if (path.startsWith("/api/")) {
      return json({
        success: false,
        error: "Route introuvable."
      }, 404);
    }

    // 7. Pages et fichiers publics, dont admin.html
    return env.ASSETS.fetch(request);
  }
};

function clean(value, max) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function cleanList(value) {
  return Array.isArray(value)
    ? value
        .filter(item => typeof item === "string")
        .map(item => item.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 30)
    : [];
}

function parseList(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(item => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function base64url(value) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  const bytes = new Uint8Array(signature);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return base64url(binary);
}

async function isAuthenticated(request, env) {
  if (!env.SESSION_SECRET) return false;

  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith("fva_admin_session="));

  if (!cookie) return false;

  const token = cookie.slice("fva_admin_session=".length);
  const separator = token.lastIndexOf(".");

  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);

  try {
    const expectedSignature = await sign(payload, env.SESSION_SECRET);

    if (suppliedSignature !== expectedSignature) return false;

    const decoded = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/")
    );

    const session = JSON.parse(decoded);

    return typeof session.exp === "number" &&
      session.exp > Date.now();
  } catch {
    return false;
  }
}

function json(value, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);

  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");

  return new Response(JSON.stringify(value), {
    status,
    headers
  });
}
