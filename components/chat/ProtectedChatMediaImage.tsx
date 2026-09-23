'use client';
import{useProtectedChatMediaUrl}from'@/hooks/useProtectedChatMediaUrl';
export function ProtectedChatMediaImage({value,alt,className}:{value:string;alt:string;className?:string}){const url=useProtectedChatMediaUrl(value);if(!url)return null;return <img src={url} alt={alt} className={className}/>;}
