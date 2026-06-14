export default function Page() {
return (
<div style={{
minHeight:"100vh",
background:"#050505",
color:"white",
padding:"40px"
}}>

<div style={{
maxWidth:"700px",
margin:"0 auto",
textAlign:"center"
}}>

<h1 style={{
fontSize:"56px",
fontWeight:"900"
}}>
Grace
</h1>

<p style={{
fontSize:"20px",
marginTop:"16px"
}}>
Try Grace free
</p>

<p>
50 free messages included
</p>

<p style={{
fontSize:"22px",
fontWeight:"700"
}}>
Grace Premium — $4.99/month
</p>

<p style={{
color:"#8CFF9B"
}}>
Cancel anytime from My Account
</p>

<p style={{
opacity:.7
}}>
No contracts • No hidden fees • Come and go whenever you want
</p>

<a
href="/chat"
style={{
display:"inline-block",
marginTop:"30px",
padding:"18px 36px",
background:"white",
color:"black",
borderRadius:"20px",
textDecoration:"none"
}}
>
Try Grace
</a>

</div>
</div>
)
}
