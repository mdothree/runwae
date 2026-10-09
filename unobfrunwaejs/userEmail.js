// DISABLED (2026-10-07): lifecycle "drip" emails (profile completion, gig
// completion, community engagement).
//
// The old version downloaded the WHOLE database (ref().once('value')) in the
// browser, iterated over every user's record (names, emails, locations) and
// wrote profile_completion_email_time into other users' nodes. That exposed
// every user's email to whoever loaded this script. It was also broken: it read
// `ob` but iterated `obj`, used the registration time as the email address,
// and assigned to the global `location` (which navigates the page).
// No page includes this file.
//
// TODO(server): if these emails are wanted, implement them as a scheduled
// serverless job (e.g. api/cron/user-emails.js with firebase-admin + a real
// mail provider) that reads users/* server-side and writes
// users/{uid}/profile_completion_email_time with admin credentials.
// Never do this from the client.
