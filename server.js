require("dotenv").config();
const express=require("express");
const rateLimit=require("express-rate-limit");
const {Resend}=require("resend");
const path=require("path");
const app=express(),PORT=process.env.PORT||3000,resend=new Resend(process.env.RESEND_API_KEY);
app.set("trust proxy",1);
app.use(express.json({limit:"20kb"}));
app.use(express.static(path.join(__dirname,"public")));
const limiter=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:true,legacyHeaders:false,message:{message:"Za dużo wiadomości. Spróbuj ponownie za kilka minut."}});
const clean=v=>typeof v==="string"?v.trim():"";
const esc=v=>v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
app.post("/api/contact",limiter,async(req,res)=>{
 try{
  const name=clean(req.body.name),company=clean(req.body.company),email=clean(req.body.email),phone=clean(req.body.phone),message=clean(req.body.message),c=req.body.configuration;
  if(name.length<2||name.length>50)return res.status(400).json({message:"Podaj poprawne imię."});
  if(!validEmail(email)||email.length>120)return res.status(400).json({message:"Podaj poprawny adres e-mail."});
  if(message.length<10||message.length>2500)return res.status(400).json({message:"Wiadomość powinna mieć od 10 do 2500 znaków."});
  if(company.length>80||phone.length>30)return res.status(400).json({message:"Jedno z pól jest za długie."});
  let cfg="";
  if(c&&typeof c==="object"){
   const t=clean(c.type),price=clean(c.price),pages=Number(c.pages),adds=Array.isArray(c.addons)?c.addons.filter(x=>typeof x==="string").slice(0,20):[];
   cfg=`<div style="margin-top:24px;padding:20px;background:#f3f5ff;border-radius:12px"><strong>Konfiguracja z kalkulatora</strong><p>Typ: ${esc(t)}</p><p>Liczba stron: ${Number.isFinite(pages)?pages:"—"}</p><p>Dodatki: ${adds.length?adds.map(esc).join(", "):"brak"}</p><p>Orientacyjny budżet: ${esc(price)}</p></div>`;
  }
  const result=await resend.emails.send({from:"Zenvia Media <onboarding@resend.dev>",to:[process.env.CONTACT_EMAIL],replyTo:email,subject:`Nowe zapytanie — ${name}${company?` / ${company}`:""}`,html:`<div style="max-width:650px;margin:auto;font-family:Arial,sans-serif;color:#191919;line-height:1.6"><h1>Nowe zapytanie ze strony Zenvia Media</h1><p><strong>Imię:</strong> ${esc(name)}</p><p><strong>Firma:</strong> ${company?esc(company):"—"}</p><p><strong>E-mail:</strong> ${esc(email)}</p><p><strong>Telefon:</strong> ${phone?esc(phone):"—"}</p><hr style="border:0;border-top:1px solid #ddd;margin:24px 0"><p><strong>Wiadomość:</strong></p><p>${esc(message).replaceAll("\n","<br>")}</p>${cfg}</div>`});
  if(result.error){console.error(result.error);return res.status(500).json({message:"Nie udało się wysłać wiadomości."})}
  res.json({message:"Wiadomość wysłana."});
 }catch(err){console.error(err);res.status(500).json({message:"Wystąpił błąd podczas wysyłania wiadomości."})}
});
app.listen(PORT,()=>console.log(`Zenvia Media działa na porcie ${PORT}`));