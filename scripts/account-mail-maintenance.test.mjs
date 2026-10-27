import { test } from "node:test";
import assert from "node:assert/strict";
import { planSharedMail } from "./account-mail-maintenance.mjs";
const sdk={FLEET_SENDER_DOMAIN:"verified.example",conventionalFrom:name=>`${name} <${name.toLowerCase()}@verified.example>`,isMailConfigured:env=>Boolean(env.RESEND_API_KEY&&!env.RESEND_API_KEY.startsWith("re_placeholder")&&!env.RESEND_FROM.includes("resend.dev"))};
const source={RESEND_API_KEY:"synthetic-shared-key"};
test("only mail settings are proposed and original configuration is preserved",()=>{const target={CAUSIUS_MASTER_KEY:"synthetic-master",DATABASE_URL:"synthetic-db"};assert.deepEqual(planSharedMail(source,target,sdk,["verified.example"]),{RESEND_API_KEY:source.RESEND_API_KEY,RESEND_FROM:sdk.conventionalFrom("Causius")});assert.deepEqual(target,{CAUSIUS_MASTER_KEY:"synthetic-master",DATABASE_URL:"synthetic-db"});});
test("a configured target is never overwritten",()=>assert.equal(planSharedMail(source,{RESEND_API_KEY:"synthetic-existing-key"},sdk,[]),null));
test("missing shared credentials and unverified domains prevent mutation",()=>{assert.throws(()=>planSharedMail({}, {},sdk,["verified.example"]),/not configured/);assert.throws(()=>planSharedMail(source,{},sdk,[]),/not provider-verified/);});
test("sandbox configuration can use the verified conventional sender",()=>assert.equal(planSharedMail(source,{RESEND_API_KEY:"re_placeholder",RESEND_FROM:"onboarding@resend.dev"},sdk,["verified.example"]).RESEND_FROM,sdk.conventionalFrom("Causius")));
