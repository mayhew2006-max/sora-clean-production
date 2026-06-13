"use client";

import {useEffect,useState} from "react";

export default function Account(){

const [email,setEmail]=useState("");
const [keep,setKeep]=useState(true);

useEffect(()=>{
const saved=localStorage.getItem("grace_email");
if(saved)setEmail(saved);
},[]);

function openPortal(){

if(!email.includes("@")){
alert("Enter subscription email");
return;
}

if(keep){
localStorage.setItem("grace_email",email);
}else{
localStorage.removeItem("grace_email");
}

window.open(
"https://billing.stripe.com/p/login",
"_blank"
);

}

return(

<div className="min-h-screen bg-black text-white flex items-center justify-center">

<div className="max-w-md w-full p-8">

<h1 className="text-4xl font-bold mb-4">

👑 Grace Account

</h1>

<input

className="w-full p-4 rounded text-black"

placeholder="Email used at checkout"

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

onClick={openPortal}

className="w-full mt-6 bg-fuchsia-500 rounded p-4"

>

Manage Subscription

</button>

<p className="mt-6 opacity-60">

Cancel anytime inside Grace

</p>

</div>

</div>

);

}
