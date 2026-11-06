const router = require("express").Router();
const db = require("../database");

const clean = value => typeof value === "string" ? value.trim() : "";
const validYear = value => value === "" || value == null || (Number.isInteger(Number(value)) && Number(value) >= 1000 && Number(value) <= new Date().getFullYear() + 1);

router.get("/", (req, res) => {
  const q = `%${clean(req.query.q)}%`;
  const includeArchived = req.query.includeArchived === "true";
  const rows = db.prepare(`SELECT * FROM books
    WHERE (? = 1 OR archived_at IS NULL)
      AND (title LIKE ? OR author LIKE ? OR COALESCE(isbn,'') LIKE ? OR COALESCE(category,'') LIKE ?)
    ORDER BY archived_at IS NOT NULL, title LIMIT 500`).all(includeArchived ? 1 : 0, q, q, q, q);
  res.json(rows);
});

router.post("/", (req, res) => {
  const b = req.body || {};
  const title = clean(b.title), author = clean(b.author), isbn = clean(b.isbn);
  const total = Number(b.total_copies ?? 1);
  if (!title || !author) return res.status(400).json({ error: "Title and author are required." });
  if (title.length > 200 || author.length > 160 || isbn.length > 32) return res.status(400).json({ error: "Title, author or ISBN is too long." });
  if (!Number.isInteger(total) || total < 0 || total > 100000) return res.status(400).json({ error: "Total copies must be a whole number from 0 to 100,000." });
  if (!validYear(b.published_year)) return res.status(400).json({ error: "Enter a valid publication year." });
  try {
    const info = db.prepare(`INSERT INTO books (isbn,title,author,category,publisher,published_year,total_copies,available_copies)
      VALUES (@isbn,@title,@author,@category,@publisher,@published_year,@total_copies,@total_copies)`).run({
      isbn: isbn || null, title, author, category: clean(b.category) || null,
      publisher: clean(b.publisher) || null, published_year: b.published_year ? Number(b.published_year) : null, total_copies: total
    });
    res.status(201).json(db.prepare("SELECT * FROM books WHERE id=?").get(info.lastInsertRowid));
  } catch (e) {
    res.status(e.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 400).json({ error: e.code === "SQLITE_CONSTRAINT_UNIQUE" ? "That ISBN is already registered." : "Could not save book." });
  }
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id), b = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid book." });
  const current = db.prepare("SELECT * FROM books WHERE id=? AND archived_at IS NULL").get(id);
  if (!current) return res.status(404).json({ error: "Active book not found." });
  const title = b.title === undefined ? current.title : clean(b.title);
  const author = b.author === undefined ? current.author : clean(b.author);
  const isbn = b.isbn === undefined ? (current.isbn || "") : clean(b.isbn);
  const total = Number(b.total_copies ?? current.total_copies);
  const year = b.published_year === undefined ? current.published_year : (b.published_year === "" ? null : Number(b.published_year));
  const borrowed = current.total_copies - current.available_copies;
  if (!title || !author) return res.status(400).json({ error: "Title and author are required." });
  if (title.length > 200 || author.length > 160 || isbn.length > 32) return res.status(400).json({ error: "Title, author or ISBN is too long." });
  if (!Number.isInteger(total) || total < borrowed || total > 100000) return res.status(400).json({ error: `Total copies must be at least ${borrowed} (currently on loan) and no more than 100,000.` });
  if (!validYear(year)) return res.status(400).json({ error: "Enter a valid publication year." });
  try {
    db.prepare(`UPDATE books SET isbn=?,title=?,author=?,category=?,publisher=?,published_year=?,total_copies=?,available_copies=? WHERE id=?`).run(
      isbn || null, title, author,
      b.category === undefined ? current.category : (clean(b.category) || null),
      b.publisher === undefined ? current.publisher : (clean(b.publisher) || null),
      year, total, total - borrowed, id
    );
    res.json(db.prepare("SELECT * FROM books WHERE id=?").get(id));
  } catch (e) { res.status(e.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 400).json({ error: "Could not update book; check that the ISBN is unique." }); }
});

// Archive rather than physically delete: circulation history remains intact.
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid book." });
  const book = db.prepare("SELECT * FROM books WHERE id=? AND archived_at IS NULL").get(id);
  if (!book) return res.status(404).json({ error: "Active book not found." });
  if (book.total_copies !== book.available_copies) return res.status(409).json({ error: "This title has copies on loan. Return all copies before archiving it." });
  db.prepare("UPDATE books SET archived_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
  res.json({ ok: true, archived: true });
});

router.post("/:id/restore", (req, res) => {
  const result = db.prepare("UPDATE books SET archived_at=NULL WHERE id=? AND archived_at IS NOT NULL").run(Number(req.params.id));
  res.status(result.changes ? 200 : 404).json({ ok: !!result.changes });
});
module.exports = router;
