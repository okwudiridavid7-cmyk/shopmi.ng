export function platformPrivacyPolicy(appName: string, webUrl: string, supportEmail: string): string {
  return `${appName} Privacy Policy

Please read this policy carefully. It explains your privacy rights and how we handle personal information on ${appName}.

Last revised: 14 September 2026

1. INTRODUCTION
${appName} (“${appName}”, “we”, “us”, or “our”) operates a multitenant online marketplace at ${webUrl} and on seller storefronts we host (including shop subdomains). We provide software that lets independent sellers publish branded shops and lets buyers discover, favorite, and purchase products.

When this Policy mentions “${appName}”, “we,” “us”, or “our”, it refers to the operator of the platform that is responsible for protection of your personal information in line with this Privacy Policy (the “Data Controller” for platform-level processing).

This Privacy Policy (“Policy”) explains how we process information that can be used to directly or indirectly identify an individual (“Personal Data”) collected on our website, seller storefronts, dashboards, APIs, and related communications (together, the “Platform”).

We process Personal Data in accordance with applicable privacy and data-protection laws. Where a law such as the EU GDPR applies to you, we aim to handle your data consistently with its core principles (lawfulness, fairness, transparency, purpose limitation, minimization, accuracy, storage limitation, integrity, and confidentiality).

For questions about this Policy or requests regarding Personal Data, contact ${supportEmail}.

2. GENERAL PRINCIPLES. CONFIDENTIALITY
We process Personal Data adhering to these principles:

* Lawfulness, fairness, and transparency — we process Personal Data lawfully and explain our practices in plain language.
* Purpose limitation — we collect and process Personal Data for specified, explicit, and legitimate purposes and do not further process it in incompatible ways.
* Data minimization — Personal Data is adequate, relevant, and limited to what is necessary.
* Accuracy — we take reasonable steps to keep Personal Data accurate and up to date.
* Storage limitation — we keep Personal Data in identifiable form only as long as needed for the purposes described here (and legal retention duties).
* Integrity and confidentiality — we use appropriate technical and organizational measures to protect Personal Data.

Information stored on the Platform is treated as confidential and accessed only by authorized personnel and processors who need it to operate the service.

3. INFORMATION WE COLLECT
3.1 Information you provide to us

Account signup and profile. When you create an account we require an email address and password (stored as a hash — we never store plain-text passwords). You may also provide name, phone, WhatsApp number, country, state, and other profile fields. Your role may be buyer, seller, and/or administrator.

Shop and listing data. Sellers provide shop name, slug, branding (colors, logos, banners), product titles, descriptions, prices, images, inventory, policies, FAQs, and published contact details.

Order and checkout details. When you place an order we process items, quantities, amounts, currency, fulfillment status, invoices, and delivery-related notes you submit. Card numbers and full payment credentials are collected by Paystack; we store payment references and status, not full card PAN or CVV.

Communications. Messages via platform or shop contact forms, verification submissions, support emails, and similar inquiries.

Verification and trust. Documents or details you submit for shop verification or abuse investigations (processed only as needed to review eligibility and safety).

Optional AI tools. If a seller requests AI-generated product descriptions or related jobs, we process the prompts and listing content needed to run that job.

Job or partnership inquiries. Information you send when applying for roles or partnerships via email or forms.

Failing to provide data that is necessary to perform a contract (for example account email or checkout details) may mean we cannot provide the related feature.

Legal bases for this processing typically include: performance of a contract; our legitimate interests in operating a secure marketplace; compliance with legal obligations; and consent where you voluntarily submit optional information or enable optional features.

3.2 Information we collect when you use the Platform

Log and device data. IP address, browser type, device/OS characteristics, approximate timestamps, and security-related events when you access the Platform (including as a guest).

Cookies and sessions. Essential cookies and similar storage for signed-in sessions (httpOnly access/refresh tokens) and guest cart identifiers. These are required for core functionality, not advertising cookies. Blocking them may prevent login or cart persistence.

Usage data. Pages viewed, search and filter queries, category browsing, and similar interactions needed to run and improve the catalog experience.

Geo-related data. Approximate location derived from country/state you select or, where applicable, coarse signals used for localized experience and fraud prevention — not precise GPS tracking by default.

Abuse-prevention signals. Patterns related to payments, account activity, suspensions, and device/session metadata to detect fraud, spam, and Terms violations.

4. HOW WE USE YOUR DATA
We use, store, and process Personal Data to:

* Identify you and operate your account, shops, and roles.
* Provide marketplace browsing, storefronts, favorites, carts, and checkout.
* Process payments via Paystack and generate invoices and order status updates.
* Send transactional messages (order, verification, security, and support) via email providers such as Resend.
* Run optional seller tools, including AI description and watermark jobs when requested.
* Create and maintain a trusted environment: verify shops, detect fraud/abuse, and enforce our Terms.
* Diagnose technical issues, secure infrastructure, and improve product performance.
* Produce aggregated, non-identifying statistics about marketplace usage.
* Comply with applicable laws and respond to lawful requests.
* Contact you about your account, disputes, surveys that improve the service, or material policy changes.

We do not sell Personal Data.

5. PAYMENTS
Checkout is processed by Paystack (or another payment processor we designate). We receive payment status and references needed for receipts and seller fulfillment. Full card credentials are not stored on ${appName} servers. Payment fraud checks may use limited transaction metadata as permitted by law and our processors’ terms.

6. SELLERS, BUYERS-OF-SELLERS, AND RESPONSIBILITIES
${appName} hosts seller storefronts. Each seller is a separate merchant. For orders placed with a shop, we share with that seller the buyer details reasonably needed to fulfill (such as name/email and order contents).

Sellers must only use customer data to fulfill orders and provide related support, keep it secure, and honour correction or deletion requests that relate to their shop. Shop-specific privacy pages may sit alongside this Policy. Where a seller is the controller of customer data for their own fulfilment, ${appName} may act as a processor or hosting provider for that subset of data; the seller remains responsible for their own compliance.

If you are a customer of a particular shop and want that shop to change how it uses your order data, contact the shop as well as ${supportEmail} for platform-level requests.

7. SHARING AND PROCESSORS
We share Personal Data with:

* Paystack (payments).
* Resend or similar providers (transactional email).
* Optional AI providers when a seller explicitly requests generation jobs.
* Hosting, database, storage, and queue infrastructure vendors.
* The relevant seller when you order from their shop.
* Professional advisers or authorities when required by law or to protect rights, safety, and integrity of the Platform.

We require processors to protect Personal Data under appropriate contractual terms. We do not sell Personal Data to third parties for their own marketing.

8. DIRECT MARKETING AND SERVICE MESSAGES
Transactional messages (orders, security, verification, billing related to your plan) are part of the service and generally cannot be opted out of while you use the account.

Marketing or promotional messages, if we send them, are based on consent or legitimate interest where permitted. You may unsubscribe via the link in the message or by emailing ${supportEmail}.

9. RETENTION AND DELETION
We retain Personal Data while your account is active and for a reasonable period afterward for tax, dispute, security, and legal compliance. Order records are kept as required for accounting and consumer claims.

Contact form submissions (name, email, optional phone, and message) are stored so we can deliver and troubleshoot support mail. We aim to delete these inquiry records from our database after about 180 days, unless a longer period is needed for an active dispute or legal obligation. Copies may remain temporarily in our email processor (Resend or similar) according to that provider’s retention settings.

You may request account deletion by emailing ${supportEmail}. You may also ask us to delete contact-form inquiries associated with your email. Some records may be retained in anonymized or limited form where law requires, or where needed to resolve disputes and prevent fraud.

10. YOUR RIGHTS
Subject to applicable law, you may contact ${supportEmail} to ask about the personal data we hold about your account, to request a correction, or to request account deletion. We may need to verify your identity before fulfilling a request. Some records may be retained where required for tax, security, fraud prevention, or legal obligations. If a supervisory authority is available in your jurisdiction, you may also have the right to lodge a complaint there.

You can often update profile details directly in your account settings.

We do not currently offer a self-serve data-export or automated rights portal; requests are handled manually through ${supportEmail}. Platform operators may look up and delete contact inquiries by email when fulfilling a verified request.

11. CHILDREN
${appName} is not directed at children under 13 (or the higher age required in your country). We do not knowingly collect Personal Data from children below that age. If you believe we have, contact ${supportEmail} so we can delete it.

12. INTERNATIONAL TRANSFERS
Infrastructure and processors may handle Personal Data in countries other than your own. Where we transfer data internationally, we take reasonable contractual and technical steps to protect it consistent with this Policy and applicable law.

13. SECURITY
We use industry-standard measures such as encrypted transport (HTTPS), hashed passwords, access controls, and monitoring. No method of transmission or storage is completely secure; please protect your credentials and notify us of suspected unauthorized access.

14. CHANGES
We will update this page when the Policy changes and revise the “Last revised” date. Continued use of the Platform after changes take effect constitutes acceptance of the revised Policy where permitted by law. Material changes may also be communicated by email or in-product notice when appropriate.

15. CONTACT
Privacy questions and data requests: ${supportEmail}
Website: ${webUrl}
`;
}

export function platformTermsOfService(appName: string, webUrl: string, supportEmail: string): string {
  return `${appName} Terms of Service

Last updated: 15 August 2026

These Terms govern access to ${appName} at ${webUrl} and all shop storefronts we host. By creating an account, listing products, or placing an order you agree to them.

1. The service
${appName} provides software that lets independent sellers publish branded shops and lets buyers discover and pay for products. We are not the seller of record for shop listings unless we expressly say so.

2. Accounts
You must provide accurate information and keep credentials confidential. You are responsible for activity under your account. We may suspend accounts that are abusive, fraudulent, or in breach of these Terms.

3. Sellers
Sellers represent that they have the right to sell listed goods, that descriptions and prices are accurate, and that they will fulfil paid orders with reasonable care. Sellers are responsible for taxes, shipping, returns they offer, and customer service for their goods. Plan limits, trial length, and platform commission apply as configured by the platform administrator.

4. Buyers
Buyers agree to pay for orders they place. Reviews must be honest and based on a paid purchase where the platform requires it. Do not attempt to circumvent checkout or payment verification.

5. Payments
Checkout is processed by Paystack. Successful payment marks an order paid. Chargebacks and payment disputes are handled under Paystack’s rules and these Terms. Unverified shops may be blocked from collecting payment when verification is required.

6. Prohibited conduct
You may not: list illegal or infringing goods; scrape the catalog in a way that harms the service; interfere with other users; upload malware; or impersonate another shop or person.

7. Intellectual property
Sellers retain rights in their logos, product photos, and copy. You grant ${appName} a licence to host and display that content to operate the marketplace. The ${appName} software, design system, and trademarks remain ours.

8. Verification and trust
Verified badges are issued at our discretion after review. They are not a guarantee of product quality. Unverified shops may still operate subject to platform settings.

9. Availability
We aim for continuous service but do not warrant uninterrupted uptime. Features that depend on third parties (payments, email, AI) may be unavailable if those providers fail.

10. Limitation of liability
To the fullest extent permitted by law, ${appName} is not liable for indirect, incidental, or consequential damages, or for losses arising from a seller’s fulfilment, product quality, or statements. Our aggregate liability for a claim relating to the platform is limited to the fees you paid us in the three months before the claim (or one hundred US dollars if you paid none).

11. Indemnity
You will indemnify ${appName} against claims arising from your listings, content, or breach of these Terms.

12. Termination
You may close your account by contacting ${supportEmail}. We may terminate or suspend access for breach. Outstanding orders should still be fulfilled.

13. Governing notes
These Terms are the entire agreement for use of the platform. If a provision is unenforceable, the rest remains in effect. Shop-specific terms published by a seller apply to purchases from that shop in addition to these Terms.

14. Contact
${supportEmail}
${webUrl}
`;
}

export function shopPrivacyPolicy(
  shopName: string,
  platformName: string,
  supportEmail: string
): string {
  return `${shopName} Privacy Policy

Last updated: 15 August 2026

This policy describes how ${shopName} (“we”, “the shop”) handles personal information when you visit our storefront on ${platformName} or place an order with us.

1. Who is responsible
${shopName} is the merchant for products sold from this storefront. ${platformName} hosts the shop, accounts, and checkout. Platform-level processing is described in the ${platformName} Privacy Policy.

2. What we collect
When you buy from us we receive the details needed to fulfil your order: name or account email, items, quantities, delivery-related notes you provide, and payment confirmation from ${platformName}/Paystack (not your full card number). If you write to us via the contact form we receive your name, email, optional phone, and message.

3. How we use it
We use this information to process and ship (or otherwise fulfil) orders, answer questions, handle returns we offer, and keep records required for tax and disputes.

4. Sharing
We share order details with ${platformName} as needed to operate checkout and invoices, and with carriers or payment providers strictly to complete the transaction. We do not sell your data.

5. Retention
Order records are kept as long as needed for fulfilment, accounting, and legal obligations. Contact-form messages are kept only as long as needed to respond.

6. Your requests
For questions about an order, contact this shop. For account deletion or marketplace-wide data requests, contact ${platformName} at ${supportEmail}.

7. Changes
If we update this policy we will publish the new text on this page.
`;
}

export function shopTermsOfService(
  shopName: string,
  platformName: string
): string {
  return `${shopName} Terms of Sale

Last updated: 15 August 2026

These terms apply when you purchase from ${shopName} on ${platformName}. They sit alongside the ${platformName} Terms of Service.

1. The contract
When you complete paid checkout, you buy from ${shopName}, not from ${platformName} (unless the listing says otherwise). Product descriptions, prices (including any compare-at / sale price), and stock shown at checkout form part of the contract.

2. Orders and payment
Orders are confirmed when payment is successfully processed. We may cancel an order if an item cannot be fulfilled, in which case you will be notified and refunded according to the payment provider’s process.

3. Fulfilment
We will fulfil in-stock items with reasonable care. Delivery times, if stated, are estimates. You must provide accurate contact information.

4. Returns
Unless a listing says otherwise, contact us promptly if goods arrive damaged or not as described. We will work with you on a repair, replacement, or refund as appropriate. Change-of-mind returns, if offered, will be described on the product or FAQ pages.

5. Your conduct
Do not submit false reviews or abusive messages. Do not use our content (photos, copy) without permission.

6. Limitation
To the extent permitted by law, ${shopName} is not liable for indirect losses. Nothing in these terms limits rights you have under mandatory consumer law.

7. Contact
Use this shop’s Contact page for order questions.
`;
}
