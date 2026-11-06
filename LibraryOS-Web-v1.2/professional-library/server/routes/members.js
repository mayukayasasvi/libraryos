const router = require("express").Router();
const db = require("../database");
const clean = value => typeof value === "string" ? value.trim() : "";
const validEmail = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.get("/", (req,res) => {
  const q = `%${clean(req.query.q)}%`;
  const includeArchived = req.query.includeArchived === "true";
  res.json(db.prepare(`SELECT * FROM members WHERE (?=1 OR archived_at IS NULL)
    AND (full_name LIKE ? OR member_code LIKE ? OR COALESCE(email,'') LIKE ? OR COALESCE(phone,'') LIKE ?)
    ORDER BY archived_at IS NOT NULL, full_name LIMIT 500`).all(includeArchived ? 1 : 0, q,q,q,q));
});

router.post("/", (req,res) => {
  const m=req.body||{}, name=clean(m.full_name), email=clean(m.email), phone=clean(m.phone);
  if (!name) return res.status(400).json({error:"Member name is required."});
  if (name.length > 160 || email.length > 254 || phone.length > 40) return res.status(400).json({error:"A member field is too long."});
  if (!validEmail(email)) return res.status(400).json({error:"Enter a valid email address."});
  const code=clean(m.member_code)||`MEM-${Date.now().toString().slice(-8)}`;
  if (code.length > 32) return res.status(400).json({error:"Member code must be 32 characters or fewer."});
  try {
    const info=db.prepare("INSERT INTO members(member_code,full_name,email,phone) VALUES(?,?,?,?)").run(code,name,email||null,phone||null);
    res.status(201).json(db.prepare("SELECT * FROM members WHERE id=?").get(info.lastInsertRowid));
  } catch(e) { res.status(e.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 400).json({error:"Member code is already in use or the record is invalid."}); }
});

router.put("/:id", (req,res) => {
  const id=Number(req.params.id), m=req.body||{};
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({error:"Invalid member."});
  const current=db.prepare("SELECT * FROM members WHERE id=? AND archived_at IS NULL").get(id);
  if (!current) return res.status(404).json({error:"Active member not found."});
  const name=m.full_name===undefined?current.full_name:clean(m.full_name);
  const code=m.member_code===undefined?current.member_code:clean(m.member_code);
  const email=m.email===undefined?(current.email||""):clean(m.email);
  const phone=m.phone===undefined?(current.phone||""):clean(m.phone);
  if (!name || !code) return res.status(400).json({error:"Member name and member code are required."});
  if (name.length>160 || code.length>32 || email.length>254 || phone.length>40) return res.status(400).json({error:"A member field is too long."});
  if (!validEmail(email)) return res.status(400).json({error:"Enter a valid email address."});
  try {
    db.prepare("UPDATE members SET member_code=?,full_name=?,email=?,phone=? WHERE id=?").run(code,name,email||null,phone||null,id);
    res.json(db.prepare("SELECT * FROM members WHERE id=?").get(id));
  } catch(e) { res.status(e.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 400).json({error:"Member code is already in use."}); }
});

router.patch("/:id/status",(req,res)=>{
  const status=req.body?.status;
  if (!["active","suspended"].includes(status)) return res.status(400).json({error:"Invalid member status."});
  const result=db.prepare("UPDATE members SET status=? WHERE id=? AND archived_at IS NULL").run(status,Number(req.params.id));
  res.status(result.changes?200:404).json({ok:!!result.changes});
});

router.delete("/:id",(req,res)=>{
  const id=Number(req.params.id);
  const member=db.prepare("SELECT id FROM members WHERE id=? AND archived_at IS NULL").get(id);
  if (!member) return res.status(404).json({error:"Active member not found."});
  if (db.prepare("SELECT 1 FROM loans WHERE member_id=? AND returned_at IS NULL LIMIT 1").get(id)) return res.status(409).json({error:"This member has books on loan. Process all returns before archiving the account."});
  db.prepare("UPDATE members SET archived_at=CURRENT_TIMESTAMP,status='suspended' WHERE id=?").run(id);
  res.json({ok:true,archived:true});
});

router.post("/:id/restore",(req,res)=>{
  const result=db.prepare("UPDATE members SET archived_at=NULL,status='active' WHERE id=? AND archived_at IS NOT NULL").run(Number(req.params.id));
  res.status(result.changes?200:404).json({ok:!!result.changes});
});
module.exports=router;
