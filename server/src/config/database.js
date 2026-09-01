import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DB_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mandal.db');
console.log(`💾 SQLite Database path resolved to: ${dbPath}`);
const db = new Database(dbPath);

// Enable WAL mode for concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      can_change_payment_status INTEGER NOT NULL DEFAULT 0,
      can_manage_expenses INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_protected_founder INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Receipts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT,
      address_galli TEXT,
      amount REAL NOT NULL,
      amount_in_words TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      notes TEXT,
      collector_id TEXT NOT NULL,
      collector_name TEXT NOT NULL,
      issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      marathi_day TEXT,
      FOREIGN KEY (collector_id) REFERENCES users(id)
    )
  `);

  // 3. Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      voucher_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_to TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      authorized_by TEXT NOT NULL,
      recorder_id TEXT NOT NULL,
      recorder_name TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      reason TEXT,
      bill_attachment_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recorder_id) REFERENCES users(id)
    )
  `);

  // 4. Audit Log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Mandal Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mandal_settings (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      location_en TEXT NOT NULL,
      location_mr TEXT NOT NULL,
      reg_no TEXT NOT NULL,
      year INTEGER NOT NULL DEFAULT 2024
    )
  `);

  // 6. UPI Contributions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS upi_contributions (
      id TEXT PRIMARY KEY,
      intent_ref TEXT UNIQUE,
      donor_name TEXT NOT NULL,
      donor_mobile TEXT NOT NULL,
      amount REAL NOT NULL,
      upi_ref_no TEXT UNIQUE,
      payment_app TEXT,
      category_code TEXT DEFAULT 'GANESHOTSAV_2024',
      campaign_id TEXT,
      address_galli TEXT,
      verification_status TEXT NOT NULL DEFAULT 'INITIATED',
      receipt_id TEXT UNIQUE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      verified_at DATETIME,
      verified_by_id TEXT,
      verified_by_name TEXT,
      rejection_reason TEXT,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id)
    )
  `);

  // 7. Donors table (Entity Normalization)
  db.exec(`
    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      address_galli TEXT,
      total_contributions REAL DEFAULT 0,
      contributions_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Campaigns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_mr TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL DEFAULT 500000,
      category_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Bank Transactions table (Reconciliation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      utr TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      payer_name TEXT,
      transaction_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNMATCHED',
      reconciled_with_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 10. Events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL,
      title_mr TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description_en TEXT,
      description_mr TEXT,
      description_hi TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      venue_en TEXT NOT NULL,
      venue_mr TEXT NOT NULL,
      venue_hi TEXT NOT NULL,
      address TEXT,
      map_url TEXT,
      organizer TEXT DEFAULT 'श्री सिद्धिविनायक मंदिर ट्रस्ट',
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      capacity INTEGER DEFAULT 0,
      registered_count INTEGER NOT NULL DEFAULT 0,
      registration_enabled INTEGER NOT NULL DEFAULT 1,
      banner_image_url TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  `);

  // 11. Event Registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT,
      attendee_name TEXT NOT NULL,
      attendee_mobile TEXT NOT NULL,
      attendee_email TEXT,
      guests_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      qr_code_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_user_unique ON event_registrations(event_id, attendee_mobile) WHERE status != 'CANCELLED';
  `);

  // 12. Announcements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_mr TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      content_en TEXT NOT NULL,
      content_mr TEXT NOT NULL,
      content_hi TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      status TEXT NOT NULL DEFAULT 'NEW',
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      author_id TEXT,
      author_name TEXT,
      related_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
    CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
  `);

  // 13. Albums table
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL,
      title_mr TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description_en TEXT,
      description_mr TEXT,
      description_hi TEXT,
      category TEXT NOT NULL DEFAULT 'FESTIVAL',
      cover_image_url TEXT,
      year INTEGER NOT NULL DEFAULT 2026,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 14. Gallery Photos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      title_en TEXT,
      title_mr TEXT,
      title_hi TEXT,
      image_url TEXT NOT NULL,
      thumbnail_url TEXT,
      caption_en TEXT,
      caption_mr TEXT,
      caption_hi TEXT,
      date_taken TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_photos_album ON gallery_photos(album_id);
  `);

  // 15. Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL DEFAULT 'SYSTEM',
      title_en TEXT NOT NULL,
      title_mr TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      message_en TEXT NOT NULL,
      message_mr TEXT NOT NULL,
      message_hi TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
  `);

  // Seed default campaigns if not present
  try {
    const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();
    if (campaignCount.count === 0) {
      const insertCampaign = db.prepare(`
        INSERT INTO campaigns (id, name_en, name_mr, description, target_amount, category_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertCampaign.run('cmp-1', 'Ganeshotsav 2026 Vargani', 'सार्वजनिक गणेशोत्सव २०२६ वर्गणी', 'Annual Ganesh Festival Celebrations', 500000, 'GANESHOTSAV_2026');
      insertCampaign.run('cmp-2', 'Mandir Development & Renovation', 'मंदिर जीर्णोद्धार व विकास निधी', 'Temple Infrastructure & Maintenance', 1000000, 'MANDIR_DEVELOPMENT');
      insertCampaign.run('cmp-3', 'Mahaprasad & Annadaan Fund', 'महाप्रसाद व अन्नदान देणगी', 'Devotee Feast and Annadaan Seva', 250000, 'MAHAPRASAD');
      insertCampaign.run('cmp-4', 'General Vargani / Donation', 'सामान्य देणगी / वर्गणी', 'General Temple Offerings and Seva', 200000, 'GENERAL');
    }
  } catch (e) {
    console.error('Campaign initialization error:', e.message);
  }

  // Seed default authentic Events if table is empty
  try {
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get();
    if (eventCount.count === 0) {
      const insertEvent = db.prepare(`
        INSERT INTO events (id, slug, title_en, title_mr, title_hi, description_en, description_mr, description_hi, date, start_time, end_time, venue_en, venue_mr, venue_hi, address, organizer, status, capacity, registered_count, banner_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertEvent.run(
        'evt-1',
        'ganesh-murti-sthapana-2026',
        'Shree Ganesh Murti Sthapana & Maha Aarti',
        'श्री गणेश मूर्ती प्राणप्रतिष्ठा व महाआरती',
        'श्री गणेश मूर्ति प्राणप्रतिष्ठा एवं महाआरती',
        'Auspicious installation of Lord Ganesha idol followed by grand Vedic chanting, Atharvashirsha recitation, and Maha Aarti with musical accompaniment.',
        'श्री गणेशाच्या मूर्तीची विधिवत प्राणप्रतिष्ठा, अथर्वशीर्ष पठण आणि भक्तिमय वातावरणात सामुदायिक महाआरती.',
        'भगवान श्री गणेश की मूर्ति की प्राणप्रतिष्ठा, अथर्वशीर्ष पाठ और भव्य महाआरती का आयोजन।',
        '2026-09-14',
        '08:00 AM',
        '12:30 PM',
        'Shree Siddhivinayak Mandir Mandap',
        'श्री सिद्धिविनायक मंदिर मुख्य मंडप',
        'श्री सिद्धिविनायक मंदिर मुख्य मंडप',
        'Sector-5, Airoli, Navi Mumbai 400708',
        'श्री सिद्धिविनायक मंदिर उत्सव समिती',
        'UPCOMING',
        500,
        42,
        '/assets/ganesha_logo.png'
      );
      insertEvent.run(
        'evt-2',
        'mahaprasad-annadaan-seva-2026',
        'Grand Mahaprasad & Annadaan Seva',
        'भव्य महाप्रसाद व अन्नदान महायज्ञ',
        'भव्य महाप्रसाद एवं अन्नदान सेवा',
        'Traditional sacred feast for all devotees, local residents, and guests with traditional modak and puran poli.',
        'सर्व भाविक व ग्रामस्थांसाठी मोदक व पुरणपोळीसह पारंपरिक पवित्र महाप्रसाद वाटप व अन्नदान सेवा.',
        'सभी श्रद्धालुओं के लिए पारंपरिक महाप्रसाद और अन्नदान सेवा का आयोजन।',
        '2026-09-18',
        '12:00 PM',
        '04:30 PM',
        'Mandir Community Hall & Dining Arena',
        'मंदिर समाज मंदिर व भोजन कक्ष',
        'मंदिर सामुदायिक भवन',
        'Sector-5, Airoli, Navi Mumbai 400708',
        'महिला मंडळ व अन्नदान समिती',
        'UPCOMING',
        1000,
        185,
        '/assets/ganesha_logo.png'
      );
      insertEvent.run(
        'evt-3',
        'cultural-bhajan-sandhya-2026',
        'Sangeet Bhajan Sandhya & Dhol-Tasha',
        'संगीत भजन संध्या व पारंपरिक ढोल-ताशा वादन',
        'संगीत भजन संध्या एवं ढोल-ताशा वादन',
        'Melodious Marathi devotional abhang and bhajan evening featuring renowned local artists and youth dhol-tasha troupe.',
        'प्रसिद्ध स्थानिक कलाकारांचे भक्तिमय अभंग, भारुड आणि युवा पथकाचे पारंपरिक ढोल-ताशा वादन सादरीकरण.',
        'भक्तिमय भजन, अभंग एवं युवा ढोल-ताशा पथक द्वारा सांस्कृतिक प्रस्तुति।',
        '2026-09-20',
        '06:30 PM',
        '10:00 PM',
        'Chhatrapati Shivaji Maharaj Rangamanch',
        'छत्रपती शिवाजी महाराज खुला रंगमंच',
        'छत्रपति शिवाजी महाराज खुला मंच',
        'Sector-5, Airoli, Navi Mumbai 400708',
        'युवा सांस्कृतिक मंच',
        'UPCOMING',
        300,
        64,
        '/assets/shivaji_portrait.png'
      );
    }
  } catch (e) {
    console.error('Events initialization error:', e.message);
  }

  // Seed default Announcements if table is empty
  try {
    const annCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
    if (annCount.count === 0) {
      const insertAnn = db.prepare(`
        INSERT INTO announcements (id, title_en, title_mr, title_hi, content_en, content_mr, content_hi, priority, status, author_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertAnn.run(
        'ann-1',
        'Auspicious Ganeshotsav 2026 Preparations Commenced',
        '🚩 गणेशोत्सव २०२६ उत्सवाची तयारी उत्साहात सुरू',
        '🚩 गणेशोत्सव २०२६ महोत्सव की तैयारियां शुरू',
        'All devotees, karyakartas, and donors are cordially invited to participate in the planning meeting this Sunday at 7:00 PM.',
        'सर्व भाविक, कार्यकर्ते व देणगीदारांना कळविण्यात येते की रविवार संध्याकाळी ७ वाजता मुख्य नियोजन बैठक संपन्न होणार आहे. सर्वांनी वेळेवर उपस्थित राहावे.',
        'सभी श्रद्धालुओं और कार्यकर्ताओं को सूचित किया जाता है कि इस रविवार शाम ७ बजे उत्सव की मुख्य नियोजन बैठक होगी।',
        'IMPORTANT',
        'IMPORTANT',
        'आनंद नाईक (मुख्य अध्यक्ष)'
      );
      insertAnn.run(
        'ann-2',
        'Online UPI Vargani & Instant Digital Receipt System Active',
        '📱 ऑनलाईन UPI वर्गणी व डिजिटल पावती प्रणाली सुरू',
        '📱 ऑनलाइन UPI दान एवं डिजिटल रसीद सुविधा शुरू',
        'Devotees can now directly contribute via UPI (9029359525m@pnb) and receive an official verified A5 donation certificate with QR verification.',
        'भाविक आता अधिकृत UPI (9029359525m@pnb) द्वारे घरबसल्या वर्गणी भरू शकतात आणि अधिकृत पावती प्रमाणपत्र त्वरित मिळवू शकतात.',
        'श्रद्धालु अब सीधे UPI (9029359525m@pnb) द्वारा दान कर सकते हैं और आधिकारिक रसीद प्राप्त कर सकते हैं।',
        'NEW',
        'NEW',
        'खजिनदार कार्यालय'
      );
    }
  } catch (e) {
    console.error('Announcements initialization error:', e.message);
  }

  // Seed default Albums and Gallery Photos if empty
  try {
    const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get();
    if (albumCount.count === 0) {
      const insertAlbum = db.prepare(`
        INSERT INTO albums (id, slug, title_en, title_mr, title_hi, description_en, description_mr, description_hi, category, cover_image_url, year, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertAlbum.run(
        'alb-1',
        'ganeshotsav-highlights-2026',
        'Ganeshotsav Divine Highlights',
        'सार्वजनिक गणेशोत्सव दर्शन व आरती',
        'सार्वजनिक गणेशोत्सव दर्शन एवं आरती',
        'Sacred photos of Lord Ganesha sthapana, morning-evening aartis, and floral decorations.',
        'श्री गणेशाची विलोभनीय मूर्ती, मनमोहक आरास आणि महाआरतीचे पवित्र क्षण.',
        'भगवान श्री गणेश के विहंगम दर्शन, महाआरती और मनमोहक पुष्प सज्जा।',
        'FESTIVAL',
        '/assets/ganesha_logo.png',
        2026,
        1
      );
      insertAlbum.run(
        'alb-2',
        'shivaji-maharaj-jayanti-celebration',
        'Chhatrapati Shivaji Maharaj Jayanti',
        'शिवजयंती उत्सव व पालखी सोहळा',
        'शिवजयंती महोत्सव एवं पालकी उत्सव',
        'Grand procession, traditional martial arts display, and historical exhibition.',
        'भव्य पालखी मिरवणूक, पारंपरिक मर्दानी खेळ आणि शिवकालीन ऐतिहासिक प्रदर्शन.',
        'भव्य पालकी यात्रा, पारंपरिक शस्त्र प्रदर्शन और शिवकालीन प्रदर्शनी।',
        'CULTURAL',
        '/assets/shivaji_portrait.png',
        2026,
        2
      );

      // Photos for alb-1 and alb-2
      const insertPhoto = db.prepare(`
        INSERT INTO gallery_photos (id, album_id, title_en, title_mr, title_hi, image_url, thumbnail_url, caption_en, caption_mr, caption_hi, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertPhoto.run(
        'pho-1',
        'alb-1',
        'Shree Siddhivinayak Divine Swaroop',
        'श्री सिद्धिविनायक विलोभनीय स्वरूप',
        'श्री सिद्धिविनायक दिव्य स्वरूप',
        '/assets/ganesha_logo.png',
        '/assets/ganesha_logo.png',
        'Majestic golden mukut and divine darshan of Lord Ganesha.',
        'सुवर्ण मुकुटाने सजलेली विघ्नहर्त्याची प्रसन्न मूर्ती.',
        'भगवान श्री गणेश का मनमोहक रूप।',
        1
      );
      insertPhoto.run(
        'pho-2',
        'alb-2',
        'Chhatrapati Shivaji Maharaj Pujan',
        'छत्रपती शिवराय पूजन व मानवंदना',
        'छत्रपति शिवाजी महाराज पूजन',
        '/assets/shivaji_portrait.png',
        '/assets/shivaji_portrait.png',
        'Salutations and floral tributes to the legendary Maratha King.',
        'हिंदवी स्वराज्य संस्थापक छत्रपती शिवाजी महाराजांना त्रिवार मानाचा मुजरा.',
        'छत्रपति शिवाजी महाराज को विनम्र नमन।',
        1
      );
    }
  } catch (e) {
    console.error('Gallery initialization error:', e.message);
  }

  // Perform backward-compatible column migrations
  try {
    // 1. users table role expansion & migration
    const userCols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
    if (!userCols.includes('email')) {
      db.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
    }

    // 2. upi_contributions migrations
    const upiCols = db.prepare(`PRAGMA table_info(upi_contributions)`).all().map(c => c.name);
    if (!upiCols.includes('intent_ref')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN intent_ref TEXT;`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_upi_intent_ref ON upi_contributions(intent_ref);`);
    }
    if (!upiCols.includes('created_at')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN created_at DATETIME;`);
    }
    if (!upiCols.includes('category_code')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN category_code TEXT DEFAULT 'GANESHOTSAV_2026';`);
    }
    if (!upiCols.includes('address_galli')) {
      db.exec(`ALTER TABLE upi_contributions ADD COLUMN address_galli TEXT;`);
    }

    // 3. receipts migrations
    const receiptCols = db.prepare(`PRAGMA table_info(receipts)`).all().map(c => c.name);
    if (!receiptCols.includes('category_code')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN category_code TEXT DEFAULT 'GANESHOTSAV_2026';`);
    }
    if (!receiptCols.includes('is_cancelled')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!receiptCols.includes('cancellation_reason')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN cancellation_reason TEXT;`);
    }
    if (!receiptCols.includes('upi_ref_no')) {
      db.exec(`ALTER TABLE receipts ADD COLUMN upi_ref_no TEXT;`);
    }

    // 4. expenses migrations
    const expenseCols = db.prepare(`PRAGMA table_info(expenses)`).all().map(c => c.name);
    if (!expenseCols.includes('status')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN status TEXT DEFAULT 'APPROVED';`);
    }
    if (!expenseCols.includes('is_cancelled')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN is_cancelled INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!expenseCols.includes('cancellation_reason')) {
      db.exec(`ALTER TABLE expenses ADD COLUMN cancellation_reason TEXT;`);
    }
  } catch (e) {
    console.error('Migration warning:', e.message);
  }

  console.log('✅ SQLite Database initialized with all required tables.');
}

export default db;

