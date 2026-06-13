"use client";

import { useEffect, useState } from "react";

export default function AccountPage() {
const [email,setEmail]=useState("");
const [keep,setKeep]=useState(true);

useEffect(()=>{
const e=localStorage.getItem("grace_email");
if(e) setEmail(e);
},[]);

function save(){
if(keep) localStorage.setItem("grace_email",email);
window.location.href="/api/create-portal-session?email="+encodeURIComponent(email);
}

return(
<main className="min-h-screen bg-black text-white flex items-center justify-center">
<div className="max-w-md w-full p-8">
<h1 className="text-4xl font-bold mb-4">👑 Grace</h1>

<input
className="w-full p-3 rounded text-black"
placeholder="Email used to subscribe"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<label className="block mt-4">
<input
type="checkbox"
checked={keep}
onChange={(e)=>setKeep(e.target.checked)}
/>
 Keep me signed in
</label>

<button
onClick={save}
className="w-full mt-6 bg-white text-black rounded p-4"
>
Manage Subscription
</button>

</div>
</main>
);
}
