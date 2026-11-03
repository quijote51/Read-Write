// Avisos en el móvil: la llama Supabase cada hora (pg_cron, supabase/avisos.sql).
// Pide a avisos_calcular() los avisos que tocan y manda a cada móvil una notificación Web Push VACÍA (solo la firma
// VAPID, sin cifrar nada): el service worker del móvil pide luego el texto con aviso_push(endpoint).
// La clave VAPID la crea esta función la primera vez y la guarda en la tabla avisos_clave (sin secretos que pegar).
// Con {"clave": true} solo devuelve la clave pública (la app la pide al activar los avisos). Gratis.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CONTACTO = "https://oidococina-xu7i.vercel.app";
const b64url = (b: Uint8Array | string) =>
  btoa(typeof b === "string" ? b : String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function claves(): Promise<{ publica: string; privada: JsonWebKey }> {
  const leer = async () => (await supa.from("avisos_clave").select("publica, privada").eq("id", 1).maybeSingle()).data;
  let c = await leer();
  if (!c) {
    const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const publica = b64url(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey)));
    const privada = await crypto.subtle.exportKey("jwk", par.privateKey);
    await supa.from("avisos_clave").upsert({ id: 1, publica, privada }, { onConflict: "id", ignoreDuplicates: true });
    c = await leer();
  }
  if (!c) throw new Error("No se ha podido crear la clave");
  return c;
}

let firmaClave: CryptoKey | null = null;
async function firmar(aud: string, privada: JsonWebKey): Promise<string> {
  firmaClave ??= await crypto.subtle.importKey("jwk", { ...privada, ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cab = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const cuerpo = b64url(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACTO }));
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, firmaClave, new TextEncoder().encode(`${cab}.${cuerpo}`)));
  return `${cab}.${cuerpo}.${b64url(firma)}`;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const k = await claves();
    const pide = await req.json().catch(() => ({}));
    if (pide && pide.clave) return Response.json({ publica: k.publica }, { headers: CORS });
    const { data, error } = await supa.rpc("avisos_calcular");
    if (error) throw error;
    let enviados = 0, borrados = 0, fallos = 0;
    for (const a of data || []) {
      try {
        const r = await fetch(a.endpoint, {
          method: "POST",
          headers: { Authorization: `vapid t=${await firmar(new URL(a.endpoint).origin, k.privada)}, k=${k.publica}`, TTL: "43200", Urgency: "normal", "Content-Length": "0" },
        });
        if (r.ok) enviados++;
        else if (r.status === 404 || r.status === 410) { await supa.rpc("avisos_quitar", { p_endpoint: a.endpoint }); borrados++; }
        else { fallos++; console.warn("push", r.status, await r.text()); }
      } catch (e) { fallos++; console.warn("push", e); }
    }
    return Response.json({ avisos: (data || []).length, enviados, borrados, fallos }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: String((e as Error).message || e) }, { status: 500, headers: CORS });
  }
});
