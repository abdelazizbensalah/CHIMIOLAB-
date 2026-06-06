import { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types/database';

interface AuthContextType {
    user: SupabaseUser | null;
    profile: User | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isLoading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setIsLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setProfile(data as User);
            } else {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    // Check if email is authorized
                    const { data: allowedEmail, error: allowedError } = await supabase
                        .from('allowed_emails')
                        .select('role')
                        .eq('email', authUser.email)
                        .single();

                    if (!allowedEmail || allowedError) {
                        console.error('Unauthorized email attempt', authUser.email);
                        await supabase.auth.signOut();
                        setUser(null);
                        setProfile(null);
                        setIsLoading(false);
                        alert("Accès refusé : Votre adresse email n'est pas autorisée par l'administrateur.");
                        return;
                    }

                    const newProfile = {
                        id: authUser.id,
                        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
                        email: authUser.email || '',
                        role: allowedEmail.role as UserRole,
                    };

                    const { data: createdProfile, error: insertError } = await supabase
                        .from('users')
                        .insert([newProfile])
                        .select()
                        .single();

                    if (!insertError && createdProfile) {
                        setProfile(createdProfile as User);
                    } else {
                        console.error('Error creating profile:', insertError);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
