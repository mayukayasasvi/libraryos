const router=require("express").Router();
const db=require("../database");
router.get("/summary",(req,res)=>{
  const one=(sql)=>db.prepare(sql).pluck().get()||0;
  res.json({
    books:one("SELECT COUNT(*) FROM books WHERE archived_at IS NULL"),
    copies:one("SELECT COALESCE(SUM(total_copies),0) FROM books WHERE archived_at IS NULL"),
    members:one("SELECT COUNT(*) FROM members WHERE status='active' AND archived_at IS NULL"),
    onLoan:one("SELECT COUNT(*) FROM loans WHERE returned_at IS NULL"),
    overdue:one("SELECT COUNT(*) FROM loans WHERE returned_at IS NULL AND due_date < date('now')"),
    available:one("SELECT COALESCE(SUM(available_copies),0) FROM books WHERE archived_at IS NULL")
  });
});
module.exports=router;
