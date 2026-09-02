import React, { useEffect, useState } from 'react';
import type { ActiveTab, Course, HomepageSection, PlatformSettings } from '../types';
import { coursesService, homepageService, settingsService } from '../services';
import { defaultHomepageSections, HomepageSectionRenderer } from './homepage/HomepageSectionRenderer';
import { ApprovedHero } from './homepage/ApprovedHero';
import { CampaignInlineBanner, CampaignSurfaces } from './homepage/CampaignSurfaces';
import { useOwnerEditMode } from './owner-edit/OwnerEditMode';

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCourse: (course: Course) => void;
  onStartLesson: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setActiveTab, onStartLesson }) => {
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { enabled: ownerEditEnabled, openSectionEditor } = useOwnerEditMode();

  useEffect(() => settingsService.subscribe(setSettings), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([
      homepageService.getPublishedSections(),
      coursesService.getPublishedCourses(),
      homepageService.getActiveCampaigns(),
    ])
      .then(([nextSections, nextCourses, nextCampaigns]) => {
        if (!live) return;
        setSections(nextSections.length ? nextSections : defaultHomepageSections(settings));
        setCourses(nextCourses);
        setCampaigns(nextCampaigns);
      })
      .catch((reason) => {
        if (!live) return;
        setError('تعذر تحميل بعض عناصر الصفحة الرئيسية.');
        setSections(defaultHomepageSections(settings));
        console.error('Homepage load failed', reason);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!sections.length || sections[0].id.startsWith('default-')) {
      setSections(defaultHomepageSections(settings));
    }
  }, [settings.heroHeadlineAr, settings.heroSubheadlineAr, settings.heroImageUrl, settings.homepageBadgeAr]);

  const navigate = (target: string) => {
    if (target.startsWith('course:')) {
      setActiveTab('courses');
      return;
    }
    if (/^https:\/\//i.test(target)) {
      window.location.assign(target);
      return;
    }
    const normalized = target.replace(/^#/, '') as ActiveTab;
    if (normalized === 'lesson') onStartLesson();
    else if (normalized) setActiveTab(normalized);
  };

  if (loading && !sections.length) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm font-bold text-slate-500" dir="rtl">
        جاري تحميل الصفحة الرئيسية...
      </div>
    );
  }

  const orderedSections = sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const heroSection = orderedSections.find((section) => section.sectionType === 'hero');
  const contentSections = orderedSections.filter((section) => section.sectionType !== 'hero');
  const topCampaign = campaigns.find((campaign) => campaign.locations.includes('homepage_banner'));
  const midCampaign = campaigns.find((campaign) => campaign.locations.includes('homepage_midpage'));

  return (
    <main className="e30-home" dir="rtl">
      <div className="sr-only" aria-live="polite">{error}</div>
      <CampaignSurfaces campaigns={campaigns} onNavigate={navigate} />
      {topCampaign && <CampaignInlineBanner campaign={topCampaign} onNavigate={navigate} />}

      <div className={`relative ${ownerEditEnabled && heroSection ? 'owner-homepage-editable' : ''}`}>
        {ownerEditEnabled && heroSection && (
          <button type="button" className="owner-section-edit" onClick={() => openSectionEditor(heroSection)}>
            تحرير الهيرو
          </button>
        )}
        <ApprovedHero settings={settings} courses={courses} onNavigate={navigate} />
      </div>

      <div className="e30-home-sections">
        {contentSections.map((section, index) => (
          <React.Fragment key={section.id}>
            <HomepageSectionRenderer
              section={section}
              settings={settings}
              courses={courses}
              onNavigate={navigate}
              ownerEditEnabled={ownerEditEnabled}
              onEdit={openSectionEditor}
            />
            {midCampaign && index === 1 && (
              <CampaignInlineBanner campaign={midCampaign} onNavigate={navigate} />
            )}
          </React.Fragment>
        ))}
      </div>
    </main>
  );
};
