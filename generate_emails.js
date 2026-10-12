// Builds emails.json: the 60 hand-written sample emails plus generated ones, 1,700 in total.
// Usage: node generate_emails.js [total]   (seeded, so the output is the same every time)

const fs = require("fs");
const path = require("path");

const TOTAL = Number(process.argv[2] || 1700);
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, "emails.base.json"), "utf8"));

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rand() * a.length)];
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const money = (lo, hi) => (lo + rand() * (hi - lo)).toFixed(2);

const FIRST = ["Sarah", "Daniel", "Priya", "Marcus", "Emily", "Jordan", "Alex", "Chen", "Maria", "Liam", "Aisha", "Noah", "Sofia", "Ethan", "Hana", "Lucas", "Grace", "Omar", "Zoe", "Mateo", "Ava", "Ryan", "Nina", "Kenji", "Leah", "Diego", "Ivy", "Samuel", "Fatima", "Owen"];
const LAST = ["Lin", "Park", "Raman", "Webb", "Chen", "Rivera", "Kozak", "Nguyen", "Garcia", "Patel", "Okafor", "Schmidt", "Rossi", "Kim", "Silva", "Brooks", "Haddad", "Novak", "Tanaka", "Moreau"];
const COMPANIES = ["Acme Corp", "Northwind", "Globex", "Initech", "Umbrella Labs", "Hooli", "Stark Analytics", "Wayne Logistics", "Pied Piper", "Vandelay Industries", "Soylent Foods", "Cyberdyne", "Massive Dynamic", "Wonka Supply"];
const PRODUCTS = ["USB-C hub", "mechanical keyboard", "standing desk mat", "noise cancelling headphones", "4K monitor", "laptop stand", "webcam", "desk lamp", "phone charger", "coffee grinder", "running shoes", "backpack", "water bottle", "air fryer"];
const SAAS = ["Notion", "Slack", "Figma", "Linear", "Vercel", "Datadog", "Sentry", "HubSpot", "Zoom", "Loom", "Airtable", "Retool", "Supabase", "Postmark"];
const STORES = ["Amazon.com", "Best Buy", "Target", "Walmart", "Etsy", "Nike", "REI", "Wayfair", "Apple Store", "Uniqlo"];
const PROMO = ["Displate", "Casper", "Allbirds", "Warby Parker", "HelloFresh", "Bombas", "Brooklinen", "Away", "Glossier", "Patagonia"];
const NEWS = ["Morning Brew", "TLDR", "The Hustle", "Lennys Newsletter", "Stratechery", "Benedicts Newsletter", "Ben's Bites", "Hacker Newsletter", "Product Hunt Daily", "The Verge"];
const SOCIAL = ["LinkedIn", "Reddit", "Discord", "X", "GitHub", "Product Hunt", "Indie Hackers", "Dev.to"];
const CITIES = ["Denver", "Austin", "Chicago", "Seattle", "Miami", "Boston", "Nashville", "Portland", "New Orleans", "San Diego"];
const REPOS = ["api", "web", "mobile", "infra", "billing", "auth", "dashboard", "worker"];
const MONTHS = ["Oct", "Nov", "Dec"];

const person = () => `${pick(FIRST)} ${pick(LAST)}`;
const day = () => `${pick(MONTHS)} ${int(1, 28)}`;

const TEMPLATES = [
  // Shopping
  () => [pick(STORES), `Ordered: ${int(1, 5)} items including ${pick(PRODUCTS)}`, `Your order #${int(100, 999)}-${int(1000000, 9999999)} has been placed. Estimated delivery ${day()}.`],
  () => [pick(["UPS", "FedEx", "USPS", "DHL"]), "Your package is out for delivery", `Tracking ${int(100000000, 999999999)} is out for delivery and should arrive by ${int(5, 9)}pm.`],
  () => [pick(STORES), `Your ${pick(PRODUCTS)} has shipped`, `Good news, your order is on the way. Track your package any time from your account.`],
  () => [pick(["Uber Eats", "DoorDash", "Grubhub"]), `Your order from ${pick(["Torchys Tacos", "Sweetgreen", "Chipotle", "Shake Shack", "Pho 88"])}`, `Thanks for ordering. Total $${money(12, 48)}. Rate your order.`],
  // Finance
  () => [pick(["Mercury", "Chase", "Brex", "Ramp"]), `You received $${money(50, 9000)} from ${pick(["STRIPE", "SHOPIFY", pick(COMPANIES).toUpperCase()])}`, `A deposit has posted to your account ending ${int(1000, 9999)}.`],
  () => ["Stripe", `Your invoice from ${pick(SAAS)} is available`, `Invoice #${int(1000, 9999)} for $${money(10, 600)} was paid with card ending ${int(1000, 9999)}. Receipt attached.`],
  () => [pick(SAAS), "Your subscription will renew soon", `Your plan renews on ${day()} for $${money(8, 400)}. No action is needed to keep your subscription.`],
  () => [pick(["Brex", "Ramp", "Expensify"]), `Receipt missing for $${money(5, 300)} at ${pick(SAAS)}`, "Upload a receipt for your recent card transaction to stay compliant."],
  () => [pick(SAAS), "Payment failed: please update your card", `We could not charge your card for $${money(10, 500)}. Your workspace will be paused in ${int(2, 7)} days.`],
  // Security
  () => ["Google", `Security alert: new sign-in on ${pick(["Mac", "Windows", "iPhone", "Android"])}`, "We noticed a new sign-in to your account. If this was you, no action is needed."],
  () => [pick(["GitHub", "AWS", "Okta", "1Password"]), "Verify your new device", `A new device tried to access your account from ${pick(CITIES)}. Enter the code to confirm it was you.`],
  () => ["Amazon Web Services", `Action required: access key exposed in ${pick(REPOS)} repository`, "We detected an IAM access key in a public repository. Rotate the key immediately to avoid misuse."],
  () => [pick(["Cloudflare", "Let's Encrypt"]), `SSL certificate for ${pick(REPOS)}.exon.dev expires in ${int(2, 9)} days`, "Auto renew failed due to a DNS validation error. Check your CNAME records."],
  // Support / work alerts
  () => ["GitHub", `[exon/${pick(REPOS)}] Run failed: ${pick(["deploy", "test", "lint", "build"])} - main`, "The workflow run failed on main. View the logs to debug."],
  () => [pick(["Vercel", "Netlify", "Render"]), `Deployment failed for exon-${pick(REPOS)}`, `Build error in src/${pick(["index", "app", "routes", "page"])}.ts. Production is still serving the previous deployment.`],
  () => [pick(["Datadog", "Sentry", "PagerDuty"]), `[Alert] ${pick(["p95 latency", "error rate", "CPU usage", "queue depth"])} above threshold on ${pick(REPOS)}`, `Triggered at ${int(1, 12)}:${int(10, 59)} ${pick(["am", "pm"])}. ${int(2, 40)} events in the last 5 minutes.`],
  () => ["Intercom", `New conversation from ${pick(COMPANIES)}`, `${pick(COMPANIES)}: our ${pick(["webhook", "dashboard", "export", "login"])} has been broken since this morning, can someone help ASAP?`],
  // Work
  () => ["Inbound reports", `Daily usage • ${int(9, 10)}/${int(1, 28)}/2026`, `Requests: ${int(10000, 90000).toLocaleString()}. Errors: ${(rand() * 2).toFixed(1)}%. Full dashboard attached.`],
  () => [pick(["Linear", "Jira", "Asana"]), `Weekly digest: ${int(4, 30)} issues completed`, `Your team completed ${int(4, 30)} issues and opened ${int(2, 20)} this week.`],
  () => [pick(["Figma", "Notion", "Google Docs"]), `${pick(FIRST)} mentioned you in ${pick(["Onboarding v3", "Q4 planning", "Pricing page", "Launch checklist", "Roadmap"])}`, "Can you take a look at this before we hand off?"],
  () => ["Zoom", "Cloud recording available: Weekly sync", "The recording is now available. It will be deleted in 30 days."],
  () => [pick(SAAS), `[Legal Update] Terms of Service update effective ${day()}, 2026`, "We are updating our terms. No action is required to continue using the service."],
  // People who need replies
  () => [person(), `Quick question about ${pick(["pricing", "the API", "your roadmap", "the integration", "onboarding"])}`, `Hey, we are evaluating a few options. ${pick(["Do you offer volume pricing?", "Is there an SLA?", "Can we get a demo next week?", "Does it support SSO?"])}`],
  () => [person(), "Re: you missed it", `Sorry we missed each other. Are you free ${pick(["Tuesday", "Wednesday", "Thursday", "Friday"])} to catch up?`],
  () => [person(), `Contract redlines for ${pick(["Thursday", "Monday", "the renewal"])}`, "Attached are the redlines from our legal team. Could you review section 4 before our call?"],
  () => [person(), `Intro: ${pick(FIRST)} <> ${pick(FIRST)}`, "Wanted to connect you two. I will let you take it from here!"],
  () => [person(), `Lunch ${pick(["Friday", "tomorrow", "next week"])}?`, `Are you around for lunch? Thinking that new ${pick(["ramen", "taco", "pizza", "thai"])} place.`],
  () => [person(), `Following up on ${pick(["the proposal", "our call", "the invoice", "the partnership"])}`, "Just bumping this to the top of your inbox. Let me know your thoughts when you get a chance."],
  // Events
  () => ["Calendly", `New event: Intro call with ${person()}`, `A 30 min call was scheduled for ${day()} at ${int(9, 4 + 12) % 12 || 12}:00.`],
  () => ["Lu.ma", `You are invited: ${pick(["AI Founders Dinner", "Demo Night", "Builders Breakfast", "Product Meetup"])} ${pick(CITIES)}`, `Join ${int(20, 200)} people on ${day()}. RSVP to save your seat.`],
  () => [person(), `Accepted: ${pick(["Weekly sync", "Design review", "1:1", "Planning"])}`, "Invitation accepted."],
  () => [pick(["Delta", "United", "Southwest"]), `Check in for your flight to ${pick(CITIES)}`, `Your flight departs tomorrow at ${int(5, 11)}:${int(10, 59)}am. Check in now to choose your seat.`],
  // Marketing / spam
  () => [pick(PROMO), `${pick(["Weekend sale", "Last chance", "Flash sale", "Members only"])}: up to ${int(2, 7) * 10}% off`, "Our sale is live. Shop now before it ends Sunday."],
  () => [pick(["Kickstartgogo", "Kickstarlaunch", "Indiegogo Picks"]), `${pick(["The smartest", "The lightest", "The future of"])} ${pick(["e-bike", "backpack", "camping stove", "hydrofoil", "smart ring"])}`, `Back the campaign today and get ${int(2, 5) * 10}% off. Limited early bird slots left!`],
  () => [pick(["SEO Rankers", "Growth Hackers Pro", "LeadGen Masters"]), `${pick(["Rank #1 on Google", "10x your leads", "Double your traffic"])} in 30 days`, `We noticed your site could do better. Our team can fix that for only $${int(99, 499)}/month.`],
  () => [pick(["RayeeTech", "Shenzhen Supply Co", "GlobalSource Ltd"]), `${pick(["Factory price", "Free samples", "Best quotation"])} for ${pick(["LED panels", "phone cases", "packaging", "PCB assembly"])}`, "Dear buyer, we are a factory. Send us your requirement for the best price."],
  () => [pick(["Account Team", "Security Center", "Billing Department"]), pick(["account violation possibility", "Final notice: account suspended", "Unusual payment detected"]), "Verify your password at the link below within 24 hours to avoid closure."],
  () => [pick(SAAS), `Introducing ${pick(["AI Assist", "Workflows 2.0", "the new dashboard", "Insights"])}`, "Our biggest launch of the year is here. See what is new."],
  // Newsletters / social
  () => [pick(NEWS), `${pick(NEWS)} #${int(100, 900)}`, "The best stories of the week, curated by hand."],
  () => [pick(SAAS), `What is new in ${pick(SAAS)} this month`, "This month: faster search, new integrations and a redesigned settings page."],
  () => [pick(SOCIAL), `${pick(["You appeared in", "Your post got", "You have"])} ${int(3, 90)} ${pick(["searches this week", "new reactions", "unread notifications"])}`, "See what you missed."],
  () => [pick(SOCIAL), `${person()} replied to your comment`, `Great point. Have you tried ${pick(["the beta", "the new API", "a different approach"])}?`],
];

const out = BASE.map((e) => ({ ...e }));
let t = Date.parse(out[out.length - 1].sent_at);
for (let i = out.length; i < TOTAL; i++) {
  const [from, subject, body] = pick(TEMPLATES)();
  t -= int(2, 20) * 60000;
  out.push({ id: i + 1, from, to: "me@exon.dev", subject, sent_at: new Date(t).toISOString(), body });
}
fs.writeFileSync(path.join(__dirname, "emails.json"), JSON.stringify(out, null, 1));
console.log(`Wrote ${out.length} emails to emails.json`);
