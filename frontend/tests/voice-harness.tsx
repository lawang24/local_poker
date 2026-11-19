// Development-only harness: real app/backend, simulated speech-service events.
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import '../src/index.css';
let current: FakeRecognition | undefined;
let starts = 0;
let stops = 0;
class FakeRecognition {
  lang = ''; continuous = true; interimResults = false;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: {error: string}) => void) | null = null;
  onresult: ((e: {resultIndex: number; results: {isFinal: boolean; 0: {transcript: string}}[]}) => void) | null = null;
  // The harness keeps the active fake service so its UI can emit callbacks.
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  start() { current = this; starts++; this.onstart?.(); update(); }
  abort() { stops++; if (current === this) current = undefined; this.onend?.(); update(); }
}
Object.assign(window, { SpeechRecognition: FakeRecognition });
const panel = document.createElement('form');
panel.style.cssText = 'position:fixed;z-index:10000;bottom:0;left:0;background:white;color:black;font:12px Arial;padding:4px;max-width:100%';
panel.innerHTML = '<label>Simulated speech <input aria-label="Simulated speech" style="width:110px;color:black;background:white" /></label><button>Emit speech</button><button type="button" id="speech-error">Deny mic</button><output></output>';
document.body.append(panel);
function update() { panel.querySelector('output')!.textContent = ` starts=${starts} stops=${stops} active=${!!current}`; }
panel.onsubmit = event => { event.preventDefault(); current?.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:panel.querySelector('input')!.value}}]}); update(); };
panel.querySelector('#speech-error')!.addEventListener('click',()=> current?.onerror?.({error:'not-allowed'}));
createRoot(document.getElementById('root')!).render(<App />);
update();
