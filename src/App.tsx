import { useState } from "react";
import { Button } from "./components/ui/button";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [wallet, setWallet] = useState<{ phrase: string; address: string } | null>(null);

  async function handleCreate() {
    try {
      // Returns [mnemonic, address]
      const [phrase, address] = await invoke("generate_seed_phrase") as [string, string];
      console.log("Wallet created:", phrase, address);
      setWallet({ phrase, address });
    } catch (error) {
      console.error("Failed to generate wallet:", error);
    }
  }

  return (
    <div>
      <Button onClick={handleCreate}>Create New Wallet</Button>
      
      {wallet && (
        <div className="bg-slate-900 p-4 mt-4 rounded border border-green-500">
          <p className="text-gray-400">Address:</p>
          <p className="text-green-400 font-mono mb-4">{wallet.address}</p>
          
          <p className="text-gray-400">Secret Phrase (Save this!):</p>
          <p className="text-white font-bold font-mono bg-black p-2 rounded">
            {wallet.phrase}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
