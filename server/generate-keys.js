import webpush from 'web-push';

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== VAPID Keys Generated ===\n');
console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('\n=== Add these to your .env file ===\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n=== Or set them as environment variables ===\n');

