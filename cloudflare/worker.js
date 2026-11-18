// The destination must not learn who called, and must not be told this hop
// is a proxy. This script forwards only content-type, x-api-key,
// authorization, anthropic-version and accept. It does not copy the client
// IP, User-Agent, cookies,
// timezone, Accept-Language, Referer, Origin, or any X-Forwarded-* / CF-*
// header, and it never forwards the incoming Request object.
//
// A raw TLS socket would also stop the runtime from attaching CF-Worker,
// CF-Ray and CDN-Loop. Workers refuse that connection to port 443 and require
// fetch(). Those three headers are added after this script runs and cannot be
// removed here.
//
// configError is this worker's own failure, not the destination's. It is JSON
// {"code":"WORKERERR","message":"..."} so a client can tell the two apart.
// A status and body that came from the destination are returned unchanged.
//
// Placement options from the Workers placement-regions API. The live value is
// upload metadata, currently aws:eu-west-3. Editing this list does not move
// the worker. One id per line, grouped by country.
//
// South Africa
//   aws:af-south-1                Cape Town
//   azure:southafricanorth        Johannesburg
//   azure:southafricawest         Cape Town
//   gcp:africa-south1             Johannesburg
// Germany
//   aws:eu-central-1              Frankfurt
//   azure:germanynorth            Berlin
//   azure:germanywestcentral      Frankfurt
//   gcp:europe-west3              Frankfurt
//   gcp:europe-west10             Berlin
// Austria
//   azure:austriaeast             Vienna
// Spain
//   aws:eu-south-2                Zaragoza
//   azure:spaincentral            Madrid
//   gcp:europe-southwest1         Madrid
// Australia
//   aws:ap-southeast-2            Sydney
//   aws:ap-southeast-4            Melbourne
//   azure:australiacentral        Canberra
//   azure:australiacentral2       Canberra
//   azure:australiaeast           Sydney
//   azure:australiasoutheast      Melbourne
//   gcp:australia-southeast1      Sydney
//   gcp:australia-southeast2      Melbourne
// Israel
//   aws:il-central-1              Tel Aviv
//   azure:israelcentral           Tel Aviv
//   gcp:me-west1                  Tel Aviv
// United Arab Emirates
//   aws:me-central-1              Dubai
//   azure:uaecentral              Abu Dhabi
//   azure:uaenorth                Dubai
// Indonesia
//   aws:ap-southeast-3            Jakarta
//   azure:indonesiacentral        Jakarta
//   gcp:asia-southeast2           Jakarta
// Ireland
//   aws:eu-west-1                 Dublin
//   azure:northeurope             Dublin
// Italy
//   aws:eu-south-1                Milan
//   azure:italynorth              Milan
//   gcp:europe-west8              Milan
//   gcp:europe-west12             Turin
// United States
//   aws:us-east-1                 Virginia
//   aws:us-east-2                 Ohio
//   aws:us-west-1                 California
//   aws:us-west-2                 Oregon
//   azure:centralus               Iowa
//   azure:eastus                  Virginia
//   azure:eastus2                 Virginia
//   azure:northcentralus          Illinois
//   azure:southcentralus          Texas
//   azure:westcentralus           Wyoming
//   azure:westus                  California
//   azure:westus2                 Washington
//   azure:westus3                 Arizona
//   gcp:us-central1               Iowa
//   gcp:us-east1                  South Carolina
//   gcp:us-east4                  Virginia
//   gcp:us-east5                  Ohio
//   gcp:us-south1                 Texas
//   gcp:us-west1                  Oregon
//   gcp:us-west2                  California
//   gcp:us-west3                  Utah
//   gcp:us-west4                  Nevada
// Bahrain
//   aws:me-south-1                Manama
// Brazil
//   aws:sa-east-1                 Sao Paulo
//   azure:brazilsouth             Sao Paulo
//   azure:brazilsoutheast         Rio de Janeiro
//   gcp:southamerica-east1        Sao Paulo
// United Kingdom
//   aws:eu-west-2                 London
//   azure:uksouth                 London
//   azure:ukwest                  Cardiff
//   gcp:europe-west2              London
// Belgium
//   azure:belgiumcentral          Brussels
//   gcp:europe-west1              Brussels
// Thailand
//   aws:ap-southeast-7            Bangkok
// Taiwan
//   aws:ap-east-2                 Taipei
//   gcp:asia-east1                Changhua
// Sweden
//   aws:eu-north-1                Stockholm
//   azure:swedencentral           Gavle
//   gcp:europe-north2             Stockholm
// Switzerland
//   aws:eu-central-2              Zurich
//   azure:switzerlandnorth        Zurich
//   azure:switzerlandwest         Geneva
//   gcp:europe-west6              Zurich
// Singapore
//   aws:ap-southeast-1            Singapore
//   azure:southeastasia           Singapore
//   gcp:asia-southeast1           Singapore
// Chile
//   azure:chilecentral            Santiago
//   gcp:southamerica-west1        Santiago
// Saudi Arabia
//   gcp:me-central2               Dammam
// France
//   aws:eu-west-3                 Paris
//   azure:francecentral           Paris
//   azure:francesouth             Marseille
//   gcp:europe-west9              Paris
// Finland
//   gcp:europe-north1             Hamina
// Qatar
//   azure:qatarcentral            Doha
//   gcp:me-central1               Doha
// Canada
//   aws:ca-central-1              Montreal
//   aws:ca-west-1                 Calgary
//   azure:canadacentral           Toronto
//   azure:canadaeast              Quebec City
//   gcp:northamerica-northeast1   Montreal
//   gcp:northamerica-northeast2   Toronto
// South Korea
//   aws:ap-northeast-2            Seoul
//   azure:koreacentral            Seoul
//   azure:koreasouth              Busan
//   gcp:asia-northeast3           Seoul
// Poland
//   azure:polandcentral           Warsaw
//   gcp:europe-central2           Warsaw
// Malaysia
//   aws:ap-southeast-5            Kuala Lumpur
//   azure:malaysiawest            Kuala Lumpur
// Mexico
//   aws:mx-central-1              Queretaro
//   azure:mexicocentral           Queretaro
//   gcp:northamerica-south1       Queretaro
// Norway
//   azure:norwayeast              Oslo
//   azure:norwaywest              Stavanger
// New Zealand
//   aws:ap-southeast-6            Auckland
//   azure:newzealandnorth         Auckland
// Netherlands
//   azure:westeurope              Amsterdam
//   gcp:europe-west4              Eemshaven
// India
//   aws:ap-south-1                Mumbai
//   aws:ap-south-2                Hyderabad
//   azure:centralindia            Pune
//   azure:southindia              Chennai
//   azure:westindia               Mumbai
//   gcp:asia-south1               Mumbai
//   gcp:asia-south2               Delhi
// Hong Kong
//   aws:ap-east-1                 Hong Kong
//   azure:eastasia                Hong Kong
//   gcp:asia-east2                Hong Kong
// Japan
//   aws:ap-northeast-1            Tokyo
//   aws:ap-northeast-3            Osaka
//   azure:japaneast               Tokyo
//   azure:japanwest               Osaka
//   gcp:asia-northeast1           Tokyo

const ALLOWED = ["content-type", "x-api-key", "authorization", "anthropic-version", "accept"];

function configError(message, status = 500) {
  return new Response(JSON.stringify({ code: "WORKERERR", message }), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    const base = env.UPSTREAM_BASE_URL;
    if (!base) return configError("UPSTREAM_BASE_URL is not set");
    let target;
    try {
      target = new URL(base);
    } catch {
      return configError("UPSTREAM_BASE_URL must be an https URL");
    }
    if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash) {
      return configError("UPSTREAM_BASE_URL must be only an https origin and optional path");
    }
    const incoming = new URL(request.url);
    if (target.hostname.toLowerCase() === incoming.hostname.toLowerCase()) {
      return configError("UPSTREAM_BASE_URL points at this worker");
    }
    const prefix = target.pathname === "/" ? "" : target.pathname.replace(/\/+$/, "");
    target.pathname = prefix + incoming.pathname;
    target.search = incoming.search;
    const headers = new Headers();
    for (const name of ALLOWED) {
      const value = request.headers.get(name);
      if (!value) continue;
      if (value.includes("\r") || value.includes("\n")) return configError("invalid header", 400);
      headers.set(name, value);
    }
    const init = { method: request.method, headers, redirect: "manual", signal: request.signal };
    if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
      init.body = request.body;
      init.duplex = "half";
    }
    return fetch(new Request(target, init));
  },
};
