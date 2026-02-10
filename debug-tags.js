const db = require('./database');

async function debugTags() {
  await db.initDatabase();

  // Create a test contact
  const contact = db.createContact('debug@test.com', 'Debug User', ['tag1', 'tag2']);
  console.log('Created contact:', contact);
  console.log('Tags type:', typeof contact.tags);
  console.log('Tags value:', contact.tags);

  // Get all contacts
  const contacts = db.getContacts();
  console.log('\nAll contacts:');
  contacts.forEach(c => {
    console.log(`  ${c.email}: tags = ${c.tags} (type: ${typeof c.tags})`);
  });

  // Cleanup
  db.deleteContact(contact.id);
  console.log('\nDebug complete.');
}

debugTags().catch(console.error);
