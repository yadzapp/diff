class CfgPatches
{
	class RedCedar
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class RedCedar
	{
		dir = "RedCedar";
		picture = "";
		action = "";
		hideName = 0;
		hidePicture = 1;
		name = "Red Cedar";
		credits = "Cedar Works";
		author = "Cedar Works";
		authorID = "76561198044112057";
		version = "3.2.0";
		extra = 0;
		type = "mod";
		dependencies[] = {"Core", "Game", "World", "Mission"};
		class defs
		{
			class engineScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/1_Core"};
			};
			class gameLibScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/2_GameLib"};
			};
			class gameScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"RedCedar/scripts/5_Mission"};
			};
		};
	};
};
