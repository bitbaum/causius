import { test } from "node:test";
import assert from "node:assert/strict";
import { atomicWrite, rollbackText, planSharedMail } from "./account-mail-maintenance.mjs";
const sdk={FLEET_SENDER_DOMAIN:"verified.example",conventionalFrom:name=>`${name} <${name.toLowerCase()}@verified.example>`,isMailConfigured:env=>Boolean(env.RESEND_API_KEY&&!env.RESEND_API_KEY.startsWith("re_placeholder")&&!env.RESEND_FROM.includes("resend.dev"))};
const source={RESEND_API_KEY:"synthetic-shared-key"};
test("only mail settings are proposed and original configuration is preserved",()=>{const target={CAUSIUS_MASTER_KEY:"synthetic-master",DATABASE_URL:"synthetic-db"};assert.deepEqual(planSharedMail(source,target,sdk,["verified.example"]),{RESEND_API_KEY:source.RESEND_API_KEY,RESEND_FROM:sdk.conventionalFrom("Causius")});assert.deepEqual(target,{CAUSIUS_MASTER_KEY:"synthetic-master",DATABASE_URL:"synthetic-db"});});
test("a configured target is never overwritten",()=>assert.equal(planSharedMail(source,{RESEND_API_KEY:"synthetic-existing-key"},sdk,[]),null));
test("missing shared credentials and unverified domains prevent mutation",()=>{assert.throws(()=>planSharedMail({}, {},sdk,["verified.example"]),/not configured/);assert.throws(()=>planSharedMail(source,{},sdk,[]),/not provider-verified/);});
test("sandbox configuration can use the verified conventional sender",()=>assert.equal(planSharedMail(source,{RESEND_API_KEY:"re_placeholder",RESEND_FROM:"onboarding@resend.dev"},sdk,["verified.example"]).RESEND_FROM,sdk.conventionalFrom("Causius")));

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
const hash=text=>createHash("sha256").update(text).digest("hex");
test("rollback restores exact original configuration and rejects later edits",()=>{
  const previous="CAUSIUS_MASTER_KEY=synthetic-master\n",current=previous+"RESEND_API_KEY=synthetic-key\n";
  const record={previousLength:previous.length,previousHash:hash(previous),appliedHash:hash(current)};
  assert.equal(rollbackText(current,record),previous);
  assert.throws(()=>rollbackText(current+"OTHER_SETTING=changed\n",record),/changed/);
  assert.throws(()=>rollbackText(current,{...record,previousHash:hash("different")}),/verification failed/);
});
test("atomic configuration replacement retains ownership and private permissions",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mail-maintenance-")),file=path.join(dir,"runtime.env");
  try {fs.writeFileSync(file,"ORIGINAL=synthetic\n",{mode:0o600});const before=fs.statSync(file);atomicWrite(file,"UPDATED=synthetic\n");const after=fs.statSync(file);assert.equal(fs.readFileSync(file,"utf8"),"UPDATED=synthetic\n");assert.equal(after.uid,before.uid);assert.equal(after.gid,before.gid);assert.equal(after.mode&0o777,0o600);assert.equal(fs.existsSync(file+".mail-config.tmp"),false);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
});
