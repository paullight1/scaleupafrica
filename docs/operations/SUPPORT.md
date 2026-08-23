# Cresciva Support & Data-Rights Runbook

## Support intake

Use the monitored Cresciva contact workflow. Do not ask users to send passwords, OTPs, full payment credentials, service-role keys or raw authentication tokens.

Classify incoming requests as:

- account/authentication;
- profile/directory/privacy;
- funding data correction;
- payment/membership;
- email/notification;
- data export/deletion;
- security/abuse;
- general product question.

## Identity-sensitive requests

For requests that change private account data, payment entitlement or deletion state, require the signed-in product flow or another operator-approved identity-verification process. A matching email address in a support message alone is not sufficient to perform a destructive action.

## Data export

Signed-in members can request the JSON export from Account settings. The export is generated server-side and contains account/profile/preferences, member funding activity and the portable payment-ledger fields without raw gateway payloads.

If export fails, troubleshoot the authenticated `account-data` Edge Function; do not assemble exports manually from screenshots or expose service-role database dumps.

## Account deletion

The product requires the exact confirmation phrase plus recent authentication. The privileged server path:

1. removes account-linked raw webhook/direct-email operational data;
2. anonymizes account-linked analytics;
3. detaches and sanitizes the minimal payment ledger required for reconciliation/accounting;
4. removes the member's `profile-media` objects;
5. deletes the Supabase Auth user so owner-linked records with `ON DELETE CASCADE` are removed.

If any pre-delete sanitization or media deletion step fails, the server stops before deleting the Auth user. Investigate the failure rather than completing a partial manual deletion.

## Profile/privacy correction

Members can edit profile fields and contact visibility through the product. For a public-profile correction that cannot be completed in-app, verify ownership before staff changes. Do not expose private contact fields in tickets, logs or screenshots unnecessarily.

## Security reports

Suspected unauthorized access, private-data exposure or credential leakage is a P0 operational incident. Preserve minimal evidence, disable/contain the affected path where necessary and follow the security/rollback runbooks.

## Funding/payment references

Use opportunity IDs, source URLs and Cresciva/Bachs payment references as support identifiers. Avoid raw provider payloads and private user data in general support channels.
