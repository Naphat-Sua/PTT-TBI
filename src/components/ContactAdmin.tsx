import { useState } from 'react';
import { Mail, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendMessageToAdmin } from '@/utils/api';

export const ContactAdmin = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  
  const handleSendMessage = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before sending",
        variant: "destructive"
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      await sendMessageToAdmin(contactName, contactEmail, contactMessage);
      
      // Clear the form and close the dialog
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setDialogOpen(false);
      
      // Show success notification
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error sending message to admin:', error);
      
      // Show error toast
      toast({
        title: "Failed to send message",
        description: "There was an error sending your message. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-[17.5rem] right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          hover:shadow-xl transition-all duration-300 transform hover:scale-105
          bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] text-white"
        aria-label="Contact Admin"
      >
        <Mail className="h-6 w-6" />
      </button>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border border-[#DFBD69]/30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl">
          <DialogHeader className="border-b border-[#DFBD69]/20 pb-4">
            <DialogTitle className="flex items-center gap-2 text-[#DFBD69]">
              <Mail className="h-5 w-5" />
              Contact Admin
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Send a message directly to the admin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-gray-600 dark:text-gray-300">
                Name
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="border-[#DFBD69]/30 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white/90 dark:bg-gray-700/80 rounded-xl shadow-inner"
                  placeholder="Your name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-gray-600 dark:text-gray-300">
                Email
              </Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="border-[#DFBD69]/30 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white/90 dark:bg-gray-700/80 rounded-xl shadow-inner"
                  placeholder="Your email"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right text-gray-600 dark:text-gray-300">
                Message
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="message"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="border-[#DFBD69]/30 focus:border-[#DFBD69] focus:ring-1 focus:ring-[#DFBD69] bg-white/90 dark:bg-gray-700/80 rounded-xl shadow-inner resize-none"
                  placeholder="Your message"
                  rows={5}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 border-t border-[#DFBD69]/20 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSending}
              className="rounded-xl border-[#DFBD69]/30 hover:bg-[#DFBD69]/10 text-gray-600 dark:text-gray-300"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={isSending || !contactName || !contactEmail || !contactMessage}
              className="rounded-xl bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] hover:opacity-90 text-white shadow-md"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};