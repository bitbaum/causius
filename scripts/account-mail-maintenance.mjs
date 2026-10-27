// Server-side maintenance only. Credential values never leave the host or logs.
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export function planSharedMail(source, target, sdk, verifiedDomains) {
  const conventional=sdk.conventionalFrom("Causius");
  const current={...target,NODE_ENV:"production",RESEND_FROM:target.RESEND_FROM||conventional};
  if(sdk.isMailConfigured(current)) return null;
  const shared={...source,NODE_ENV:"production",RESEND_FROM:source.RESEND_FROM||sdk.conventionalFrom("BiasLens")};
  if(!sdk.isMailConfigured(shared)) throw new Error("Shared mail transport is not configured");
  if(!verifiedDomains.includes(sdk.FLEET_SENDER_DOMAIN)) throw new Error("Shared sender domain is not provider-verified");
  return {RESEND_API_KEY:source.RESEND_API_KEY,RESEND_FROM:conventional};
}
const digest=text=>createHash("sha256").update(text).digest("hex");
export function rollbackText(current,record) {
  if(record.appliedHash!==digest(current))throw new Error("Configuration changed after maintenance; refusing to overwrite it");
  const previous=current.slice(0,record.previousLength);
  if(digest(previous)!==record.previousHash)throw new Error("Rollback prefix verification failed");
  return previous;
}

export function atomicWrite(file,text) {
  const stat=fs.statSync(file),temporary=file+".mail-config.tmp";
  fs.writeFileSync(temporary,text,{mode:0o600});fs.chownSync(temporary,stat.uid,stat.gid);fs.renameSync(temporary,file);
}
let stage="validate-action";
async function main() {
  const mode=process.argv[2]||"inspect";
  if(!["inspect","configure","rollback","finalize"].includes(mode)) throw new Error("Invalid maintenance action");
  stage="locate-runtime-config";
  const targetFile=["/opt/causius/shared/.env","/opt/causius/app/.env"].find(file=>fs.existsSync(file));
  if(!targetFile)throw new Error("Causius runtime configuration is unavailable");
  const file=fs.realpathSync(targetFile);if(!file.startsWith("/opt/causius/"))throw new Error("Unexpected runtime configuration location");
  const journal=path.join(path.dirname(file),".account-mail-rollback.json");
  if(mode==="finalize"){if(fs.existsSync(journal))fs.unlinkSync(journal);console.log(JSON.stringify({finalized:true}));return;}
  if(mode==="rollback"){
    const record=JSON.parse(fs.readFileSync(journal,"utf8")),current=fs.readFileSync(file,"utf8");
    const previous=rollbackText(current,record);
    atomicWrite(file,previous);fs.unlinkSync(journal);console.log(JSON.stringify({rolledBack:true}));return;
  }
  stage="load-mail-sdk";
  const sdk=await import(new URL("./mail-sdk/index.js",import.meta.url).href);
  stage="inspect-mail-config";
  const sharedFile="/opt/fleet/env";
  const inherited=fs.existsSync(sharedFile)?parseEnv(fs.readFileSync(sharedFile,"utf8")):{};
  const before=fs.readFileSync(file,"utf8"),target={...inherited,...parseEnv(before)};
  const sourceFile=["/opt/biaslens/shared/.env","/opt/biaslens/app/.env"].find(candidate=>fs.existsSync(candidate));
  const source={...inherited,...(sourceFile?parseEnv(fs.readFileSync(sourceFile,"utf8")):{})};
  const configured=(env,title)=>sdk.isMailConfigured({...env,NODE_ENV:"production",RESEND_FROM:env.RESEND_FROM||sdk.conventionalFrom(title)});
  console.log(JSON.stringify({targetConfigured:configured(target,"Causius"),sharedConfigured:configured(source,"BiasLens"),action:mode}));
  if(mode==="inspect"||configured(target,"Causius"))return;
  if(!configured(source,"BiasLens"))throw new Error("No configured shared transport; no configuration changed");
  stage="verify-provider-domain";
  const response=await fetch("https://api.resend.com/domains",{headers:{Authorization:`Bearer ${source.RESEND_API_KEY}`},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Provider domain verification unavailable (HTTP ${response.status}); no configuration changed`);
  const domains=(await response.json()).data??[];
  stage="plan-mail-config";
  const changes=planSharedMail(source,target,sdk,domains.filter(domain=>domain.status==="verified").map(domain=>domain.name));
  if(!changes)return;
  if(fs.existsSync(journal))throw new Error("Previous maintenance awaits finalization or rollback");
  const next=before+(before.endsWith("\n")?"":"\n")+"# Shared account-mail transport; configured by maintenance\n"+Object.entries(changes).map(([key,value])=>`${key}=${JSON.stringify(value)}\n`).join("");
  if(digest(fs.readFileSync(file,"utf8"))!==digest(before))throw new Error("Concurrent configuration update; no configuration changed");
  stage="write-mail-config";
  fs.writeFileSync(journal,JSON.stringify({previousLength:before.length,previousHash:digest(before),appliedHash:digest(next)}),{mode:0o600});
  atomicWrite(file,next);console.log(JSON.stringify({changed:Object.keys(changes),providerDomainVerified:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(JSON.stringify({error:"Account mail maintenance failed",stage,code:["MODULE_NOT_FOUND","ERR_MODULE_NOT_FOUND","ERR_PACKAGE_PATH_NOT_EXPORTED","EACCES","ENOENT","ABORT_ERR"].includes(error.code)?error.code:"UNCLASSIFIED"}));process.exitCode=1;});
