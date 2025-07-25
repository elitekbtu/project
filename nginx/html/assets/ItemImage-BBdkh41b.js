import{j as n}from"./ui-Cqf_O7uz.js";import"./router-YsGj19cs.js";import{S as p}from"./shopping-bag-Din1qLo_.js";const f=({src:e,alt:a,className:m="",fallbackClassName:o="",style:l})=>{const r=e!=null&&e.startsWith("/uploads/")?`${window.location.origin}${e}`:e;return r?n.jsx("img",{src:r,alt:a,className:m,style:l,onError:d=>{const i=d.target,s=i.parentElement;if(s){i.style.display="none";const t=document.createElement("div");t.className=`flex items-center justify-center bg-muted ${o}`,t.innerHTML=`
            <svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
          `,s.appendChild(t)}}}):n.jsx("div",{className:`flex items-center justify-center bg-muted ${o}`,children:n.jsx(p,{className:"h-12 w-12 text-muted-foreground"})})};export{f as I};
