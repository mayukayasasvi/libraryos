const router = require("express").Router();
const db = require("../database");
router.get("/", (req,res) => {
  const rows=db.prepare(`SELECT l.*,b.title AS book_title,b.isbn,m.full_name AS member_name,m.member_code,
    CASE WHEN l.returned_at IS NULL AND l.due_date < date('now') THEN 1 ELSE 0 END AS overdue
    FROM loans l JOIN books b ON b.id=l.book_id JOIN members m ON m.id=l.member_id
    ORDER BY l.returned_at IS NULL DESC,l.due_date ASC LIMIT 1000`).all();
  res.json(rows);
});
router.post("/", (req,res) => {
  const bookId=Number(req.body?.book_id), memberId=Number(req.body?.member_id);
  const dueDate=req.body?.due_date;
  if(!Number.isSafeInteger(bookId)||bookId<1||!Number.isSafeInteger(memberId)||memberId<1||!/^\d{4}-\d{2}-\d{2}$/.test(dueDate||"")||!Number.isFinite(Date.parse(dueDate+"T00:00:00Z"))||new Date(dueDate+"T00:00:00Z").toISOString().slice(0,10)!==dueDate) return res.status(400).json({error:"Choose a book, member and valid due date."});
  const issue=db.transaction(()=>{
    const book=db.prepare("SELECT * FROM books WHERE id=? AND archived_at IS NULL").get(bookId);
    const member=db.prepare("SELECT * FROM members WHERE id=? AND archived_at IS NULL").get(memberId);
    if(!book) throw new Error("Book not found.");
    if(!member || member.status!=="active") throw new Error("Member is missing or suspended.");
    if(book.available_copies<1) throw new Error("No copies are currently available.");
    const info=db.prepare("INSERT INTO loans(book_id,member_id,issued_by,issue_date,due_date) VALUES(?,?,?,?,?)")
      .run(bookId,memberId,req.session.user.id,new Date().toISOString().slice(0,10),dueDate);
    db.prepare("UPDATE books SET available_copies=available_copies-1 WHERE id=?").run(bookId);
    return info.lastInsertRowid;
  });
  try { res.status(201).json({id:issue()}); } catch(e) { res.status(400).json({error:e.message}); }
});
router.post("/:id/return",(req,res)=>{
  const loanId=Number(req.params.id);
  const action=db.transaction(()=>{
    const loan=db.prepare("SELECT * FROM loans WHERE id=?").get(loanId);
    if(!loan) throw new Error("Loan not found.");
    if(loan.returned_at) throw new Error("This book has already been returned.");
    db.prepare("UPDATE loans SET returned_at=CURRENT_TIMESTAMP WHERE id=?").run(loanId);
    db.prepare("UPDATE books SET available_copies=available_copies+1 WHERE id=?").run(loan.book_id);
  });
  try { action(); res.json({ok:true}); } catch(e) { res.status(400).json({error:e.message}); }
});
module.exports=router;
