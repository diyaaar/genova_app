import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(() => ({ command:vi.fn(), admin:true }));
vi.mock('@/components/AuthProvider',()=>({useAuth:()=>({activeChoir:{choir_id:'choir-a',choir_name:'Test Korosu'},isAdmin:()=>mocks.admin})}));
vi.mock('@/lib/choir-invitations',()=>({invitationCommand:mocks.command,invitationStatus:()=> 'Bekliyor'}));
import InvitationManager from './InvitationManager';
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><InvitationManager /></QueryClientProvider>);}
beforeEach(()=>{mocks.admin=true;mocks.command.mockReset();mocks.command.mockImplementation(async(body)=>body.action==='create'?{token:'a'.repeat(64)}:{invitations:[]});});
describe('invitation management',()=>{
  it('does not load or show management for a non-Chef',()=>{mocks.admin=false;mount();expect(screen.queryByRole('button',{name:'Davet oluştur'})).toBeNull();expect(mocks.command).not.toHaveBeenCalled();});
  it('creates only a Korist invitation in the current choir and shows a fragment link',async()=>{
    mount();const user=userEvent.setup();
    await user.type(screen.getByLabelText('E-posta'),'ada@example.invalid');
    await user.type(screen.getByLabelText('Ad',{exact:true}),'Ada');
    await user.type(screen.getByLabelText('Soyad'),'Lovelace');
    await user.click(screen.getByRole('button',{name:'Davet oluştur'}));
    await waitFor(()=>expect(mocks.command).toHaveBeenCalledWith({action:'create',choirId:'choir-a',email:'ada@example.invalid',firstName:'Ada',lastName:'Lovelace',voiceGroup:'Soprano'}));
    expect(await screen.findByLabelText('Davet bağlantısı')).toHaveValue(window.location.origin+'/invite#invite='+'a'.repeat(64));
  });
});
